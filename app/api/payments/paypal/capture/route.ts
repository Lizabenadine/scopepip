import { publicEstimate, recordPublicDeposit } from "@/lib/auth/directory"
import { payoutForEstimate } from "@/lib/payments/account-payout"
import { depositCharge } from "@/lib/payments/charge"
import { paypalAccessToken, paypalCapturedOrder, paypalCaptureReceipt } from "@/lib/payments/paypal"
import { payoutStatus } from "@/lib/payments/payouts"

export const runtime = "nodejs"

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { estimateId?: string; orderId?: string } | null
  const estimateId = body?.estimateId?.trim() ?? ""
  const orderId = body?.orderId?.trim() ?? ""
  if (!/^[a-z0-9-]{4,80}$/i.test(estimateId) || !/^[A-Za-z0-9-]{6,40}$/.test(orderId)) {
    return Response.json({ ok: false, reason: "This PayPal payment could not be read." }, { status: 400 })
  }
  const view = await publicEstimate(estimateId)
  const charge = view ? depositCharge(view.estimate, view.paymentMethods) : null
  if (!view || !charge) {
    return Response.json({ ok: false, reason: "Accept the proposal before paying the deposit." }, { status: 400 })
  }
  const account = await payoutForEstimate(estimateId)
  if (!account || !payoutStatus(account).paypal) {
    return Response.json({ ok: false, reason: "PayPal is not connected." }, { status: 400 })
  }
  const live = account.paypalMode === "live"
  const token = await paypalAccessToken({ clientId: account.paypalClientId, secret: account.paypalSecret, live })
  if (!token) return Response.json({ ok: false, reason: "PayPal is not connected." }, { status: 400 })
  const order = await paypalCapturedOrder(token, live, orderId)
  const captured = paypalCaptureReceipt(order, estimateId, charge.amount)
  if (!captured) return Response.json({ ok: false, reason: "PayPal did not capture this deposit." }, { status: 400 })
  const saved = await recordPublicDeposit(estimateId, {
    paymentIntentId: captured.captureId,
    amount: captured.amount,
    currency: "usd",
    depositPercent: charge.percent,
    method: "paypal",
    paidAt: new Date().toISOString(),
  })
  if (!saved.ok) return Response.json(saved, { status: 400 })
  return Response.json(saved)
}
