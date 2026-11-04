import { publicEstimate } from "@/lib/auth/directory"
import { payoutForEstimate } from "@/lib/payments/account-payout"
import { depositCharge } from "@/lib/payments/charge"
import { paddleApiBase, paddleTransactionBody } from "@/lib/payments/paddle-charge"
import { paddleKeyMode, payoutStatus } from "@/lib/payments/payouts"

export const runtime = "nodejs"

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { estimateId?: string } | null
  const estimateId = body?.estimateId?.trim() ?? ""
  if (!/^[a-z0-9-]{4,80}$/i.test(estimateId)) {
    return Response.json({ error: "This estimate is not on file." }, { status: 404 })
  }
  const view = await publicEstimate(estimateId)
  const charge = view ? depositCharge(view.estimate, view.paymentMethods) : null
  if (!view || !charge) {
    return Response.json({ error: "Accept the proposal before paying the deposit." }, { status: 400 })
  }
  const account = await payoutForEstimate(estimateId)
  if (!account || !payoutStatus(account).paddle) {
    return Response.json({ error: "Paddle is not connected." }, { status: 400 })
  }
  const mode = paddleKeyMode(account.paddleApiKey)
  if (!mode) return Response.json({ error: "Paddle is not connected." }, { status: 400 })
  const cents = Math.round(charge.dollars * 100)
  const response = await fetch(`${paddleApiBase(mode)}/transactions`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${account.paddleApiKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(paddleTransactionBody(estimateId, cents, `Deposit for ${view.estimate.title}`)),
  })
  const payload = (await response.json().catch(() => null)) as { data?: { id?: string } } | null
  const transactionId = payload?.data?.id ?? ""
  if (!response.ok || !transactionId.startsWith("txn_")) {
    return Response.json({ error: "Paddle did not start the payment." }, { status: 502 })
  }
  return Response.json({ transactionId, clientToken: account.paddleClientToken })
}
