import Stripe from "stripe"
import { payoutForEstimate } from "@/lib/payments/account-payout"
import { clampDepositPercent, depositAmount, depositCents } from "@/lib/payments/deposit"
import { payoutStatus } from "@/lib/payments/payouts"
import { signTestIntent } from "@/lib/payments/test-intents"

export const runtime = "nodejs"

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    estimateId?: string
    total?: number
    depositPercent?: number
  } | null
  const estimateId = body?.estimateId?.trim() ?? ""
  const total = Number(body?.total)
  const depositPercent = clampDepositPercent(body?.depositPercent)
  if (!estimateId || !Number.isFinite(total) || total <= 0) {
    return Response.json({ error: "A priced estimate is required." }, { status: 400 })
  }

  const amount = depositCents(total, depositPercent)
  const account = await payoutForEstimate(estimateId)
  const connected = account ? payoutStatus(account) : null
  const secret = connected?.stripe ? account?.stripeSecret ?? "" : ""
  const publishable = connected?.stripe ? account?.stripePublishable ?? "" : ""
  if (!secret || !publishable.startsWith("pk_")) {
    const paymentIntentId = `pi_test_${crypto.randomUUID().replace(/-/g, "")}`
    const issued = {
      id: paymentIntentId,
      estimateId,
      amountCents: amount,
      depositPercent,
      total,
    }
    return Response.json({
      mode: "test",
      paymentIntentId,
      testToken: signTestIntent(issued),
      clientSecret: null,
      publishableKey: null,
      depositAmount: depositAmount(total, depositPercent),
      depositPercent,
      currency: "usd",
    })
  }

  const stripe = new Stripe(secret)
  const intent = await stripe.paymentIntents.create({
    amount,
    currency: "usd",
    automatic_payment_methods: { enabled: true },
    metadata: {
      estimateId,
      depositPercent: String(depositPercent),
      jobTotal: String(total),
    },
  })
  return Response.json({
    mode: "stripe",
    paymentIntentId: intent.id,
    clientSecret: intent.client_secret,
    publishableKey: publishable,
    depositAmount: depositAmount(total, depositPercent),
    depositPercent,
    currency: "usd",
  })
}
