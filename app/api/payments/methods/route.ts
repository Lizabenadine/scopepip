import { publicEstimate } from "@/lib/auth/directory"
import { payoutForEstimate } from "@/lib/payments/account-payout"
import { payoutStatus } from "@/lib/payments/payouts"

export const runtime = "nodejs"

export async function GET(request: Request) {
  const estimateId = new URL(request.url).searchParams.get("estimateId")?.trim() ?? ""
  if (!/^[a-z0-9-]{4,80}$/i.test(estimateId)) {
    return Response.json({ stripe: false, paypal: false, paddle: false, bank: false })
  }
  const view = await publicEstimate(estimateId)
  const account = view ? await payoutForEstimate(estimateId) : null
  if (!view || !account) return Response.json({ stripe: false, paypal: false, paddle: false, bank: false })
  const status = payoutStatus(account)
  return Response.json({
    stripe: status.stripe,
    paypal: status.paypal,
    paddle: status.paddle,
    bank: status.bank,
    bankName: status.bank ? status.bankName : "",
    accountHolder: status.bank ? status.accountHolder : "",
    routingNumber: status.bank ? account.routingNumber : "",
    accountNumber: status.bank ? account.accountNumber : "",
    accountLast4: status.accountLast4,
  })
}
