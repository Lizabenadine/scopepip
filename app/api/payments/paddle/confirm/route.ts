import { publicEstimate, recordPublicDeposit } from "@/lib/auth/directory"
import { payoutForEstimate } from "@/lib/payments/account-payout"
import { depositCharge } from "@/lib/payments/charge"
import { paddleApiBase, paddlePaidDeposit } from "@/lib/payments/paddle-charge"
import { paddleKeyMode, payoutStatus } from "@/lib/payments/payouts"

export const runtime = "nodejs"

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { estimateId?: string; transactionId?: string } | null
  const estimateId = body?.estimateId?.trim() ?? ""
  const transactionId = body?.transactionId?.trim() ?? ""
  if (!/^[a-z0-9-]{4,80}$/i.test(estimateId) || !/^txn_[A-Za-z0-9]{6,40}$/.test(transactionId)) {
    return Response.json({ ok: false, reason: "This Paddle payment could not be read." }, { status: 400 })
  }
  const view = await publicEstimate(estimateId)
  const charge = view ? depositCharge(view.estimate, view.paymentMethods) : null
  if (!view || !charge) {
    return Response.json({ ok: false, reason: "Accept the proposal before paying the deposit." }, { status: 400 })
  }
  const account = await payoutForEstimate(estimateId)
  const mode = account ? paddleKeyMode(account.paddleApiKey) : null
  if (!account || !mode || !payoutStatus(account).paddle) {
    return Response.json({ ok: false, reason: "Paddle is not connected." }, { status: 400 })
  }
  const response = await fetch(`${paddleApiBase(mode)}/transactions/${transactionId}`, {
    headers: { authorization: `Bearer ${account.paddleApiKey}` },
  })
  const payload = await response.json().catch(() => null)
  const paidId = response.ok ? paddlePaidDeposit(payload, estimateId, Math.round(charge.dollars * 100)) : null
  if (!paidId) return Response.json({ ok: false, reason: "Paddle has not marked this deposit paid." }, { status: 400 })
  const saved = await recordPublicDeposit(estimateId, {
    paymentIntentId: paidId,
    amount: charge.dollars,
    currency: "usd",
    depositPercent: charge.percent,
    method: "paddle",
    paidAt: new Date().toISOString(),
  })
  if (!saved.ok) return Response.json(saved, { status: 400 })
  return Response.json(saved)
}
