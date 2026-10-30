import Stripe from "stripe"
import { readSendKeys } from "@/lib/messaging/keys"
import { receiptFromPaymentIntent, type PaymentIntentPayload } from "@/lib/payments/deposit"
import { syncDeposit } from "@/lib/payments/sync-deposit"
import { verifyTestIntent } from "@/lib/payments/test-intents"

export const runtime = "nodejs"

interface StripeEvent {
  type?: string
  data?: { object?: PaymentIntentPayload }
}

export async function POST(request: Request) {
  const raw = await request.text()
  const keys = readSendKeys()
  const secret = keys.stripeWebhookSecret
  const stripeKey = keys.stripeSecret
  let event: StripeEvent

  if (stripeKey && secret) {
    const stripe = new Stripe(stripeKey)
    try {
      event = stripe.webhooks.constructEvent(
        raw,
        request.headers.get("stripe-signature") ?? "",
        secret,
      ) as StripeEvent
    } catch {
      return Response.json({ error: "Invalid Stripe signature." }, { status: 400 })
    }
  } else if (!stripeKey && request.headers.get("x-scopepipe-test") === "1") {
    try {
      event = JSON.parse(raw) as StripeEvent
    } catch {
      return Response.json({ error: "Unknown test payment." }, { status: 400 })
    }
    const issued = verifyTestIntent(event.data?.object?.metadata?.testToken)
    if (
      !issued ||
      issued.id !== event.data?.object?.id ||
      issued.amountCents !== event.data?.object?.amount ||
      issued.estimateId !== event.data?.object?.metadata?.estimateId
    ) {
      return Response.json({ error: "Unknown test payment." }, { status: 400 })
    }
  } else {
    return Response.json({ error: "Stripe webhook is not configured." }, { status: 400 })
  }

  if (event.type !== "payment_intent.succeeded" || !event.data?.object) {
    return Response.json({ received: true })
  }

  const paidAt = new Date().toISOString()
  const parsed = receiptFromPaymentIntent(event.data.object, paidAt)
  if (!parsed) return Response.json({ error: "Payment is missing estimate details." }, { status: 400 })

  try {
    await syncDeposit(parsed.estimateId, parsed.receipt)
  } catch (error) {
    const message = error instanceof Error ? error.message : "The hosted book did not record the deposit."
    return Response.json({ error: message }, { status: 502 })
  }

  return Response.json({ received: true, estimateId: parsed.estimateId, receipt: parsed.receipt })
}
