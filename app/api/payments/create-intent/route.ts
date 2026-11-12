import Stripe from "stripe"
import { companyEstimate, publicProposal } from "@/lib/auth/directory"
import { sessionFromRequest } from "@/lib/auth/request"
import { readSendKeys } from "@/lib/messaging/keys"
import { depositAmount, depositCents } from "@/lib/payments/deposit"
import { signTestIntent } from "@/lib/payments/test-intents"
import { clientPaymentAvailability, isProposalToken } from "@/lib/proposals/token"

export const runtime = "nodejs"

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    token?: unknown
    estimateId?: unknown
  } | null

  const token = isProposalToken(body?.token) ? body.token : ""
  const estimateIdInput = typeof body?.estimateId === "string" ? body.estimateId.trim() : ""

  let estimate
  let paymentMethods
  if (token) {
    const view = await publicProposal(token)
    if (!view) return Response.json({ error: "This proposal link is not valid." }, { status: 404 })
    estimate = view.estimate
    paymentMethods = view.paymentMethods
  } else {
    const session = await sessionFromRequest(request)
    if (!session) return Response.json({ error: "A valid proposal link or contractor login is required." }, { status: 401 })
    if (!estimateIdInput) return Response.json({ error: "An estimate id is required." }, { status: 400 })
    const owned = await companyEstimate(session.companyId, estimateIdInput)
    if (!owned) return Response.json({ error: "This estimate is not on file." }, { status: 404 })
    estimate = owned.estimate
    paymentMethods = owned.paymentMethods
  }

  const eligibility = clientPaymentAvailability(estimate, paymentMethods)
  if (!eligibility.enabled) {
    return Response.json({ error: eligibility.reason || "Online payment is not enabled for this proposal." }, { status: 403 })
  }

  const estimateId = estimate.id
  const total = eligibility.total
  const depositPercent = eligibility.depositPercent
  const amount = depositCents(total, depositPercent)
  if (amount <= 0) {
    return Response.json({ error: "A priced deposit is required." }, { status: 400 })
  }

  const keys = readSendKeys()
  const secret = keys.stripeSecret
  if (!secret || !keys.stripePublishable.startsWith("pk_")) {
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
    publishableKey: keys.stripePublishable,
    depositAmount: depositAmount(total, depositPercent),
    depositPercent,
    currency: "usd",
  })
}
