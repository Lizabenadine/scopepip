import { publicEstimate } from "@/lib/auth/directory"
import { payoutForEstimate } from "@/lib/payments/account-payout"
import { depositCharge } from "@/lib/payments/charge"
import { paypalAccessToken, paypalCreateOrder, paypalOrderBody } from "@/lib/payments/paypal"
import { payoutStatus } from "@/lib/payments/payouts"

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
  if (!account || !payoutStatus(account).paypal) {
    return Response.json({ error: "PayPal is not connected." }, { status: 400 })
  }
  const live = account.paypalMode === "live"
  const token = await paypalAccessToken({ clientId: account.paypalClientId, secret: account.paypalSecret, live })
  if (!token) return Response.json({ error: "PayPal did not accept the connected account." }, { status: 502 })
  const origin = new URL(request.url).origin
  const created = await paypalCreateOrder(
    token,
    live,
    paypalOrderBody({
      estimateId,
      amount: charge.amount,
      returnUrl: `${origin}/estimates/${estimateId}/pay?paypal=return`,
      cancelUrl: `${origin}/estimates/${estimateId}/pay?paypal=cancel`,
    }),
  )
  if ("error" in created) return Response.json({ error: created.error }, { status: 502 })
  return Response.json({ approveUrl: created.approveUrl })
}
