import { sessionFromRequest } from "@/lib/auth/request"
import { paypalAccessToken } from "@/lib/payments/paypal"
import { paddleAccountAccepted, stripeAccountAccepted } from "@/lib/payments/payout-check"
import { clearPayout, payoutStatus, readPayout, savePayout, type PayoutAccount } from "@/lib/payments/payouts"

export const runtime = "nodejs"

export async function GET(request: Request) {
  const session = await sessionFromRequest(request)
  if (!session || session.role !== "owner") return Response.json({ ok: false }, { status: 401 })
  return Response.json({ ok: true, ...payoutStatus(readPayout(session.companyId)) })
}

export async function POST(request: Request) {
  const session = await sessionFromRequest(request)
  if (!session || session.role !== "owner") {
    return Response.json({ ok: false, reason: "Only the owner can connect a payment account." }, { status: 401 })
  }
  const body = await request.json().catch(() => null)
  if (!body || typeof body !== "object") return Response.json({ ok: false, reason: "Missing payment account." }, { status: 400 })
  const record = body as Record<string, unknown>
  if (record.clear === "stripe" || record.clear === "paypal" || record.clear === "paddle" || record.clear === "bank") {
    return Response.json({ ok: true, ...clearPayout(session.companyId, record.clear) })
  }
  const patch: Partial<PayoutAccount> = {}
  if (typeof record.stripeSecret === "string") patch.stripeSecret = record.stripeSecret
  if (typeof record.stripePublishable === "string") patch.stripePublishable = record.stripePublishable
  if (typeof record.paypalClientId === "string") patch.paypalClientId = record.paypalClientId
  if (typeof record.paypalSecret === "string") patch.paypalSecret = record.paypalSecret
  if (record.paypalMode === "live" || record.paypalMode === "sandbox") patch.paypalMode = record.paypalMode
  if (typeof record.paddleApiKey === "string") patch.paddleApiKey = record.paddleApiKey
  if (typeof record.paddleClientToken === "string") patch.paddleClientToken = record.paddleClientToken
  if (typeof record.bankName === "string") patch.bankName = record.bankName
  if (typeof record.accountHolder === "string") patch.accountHolder = record.accountHolder
  if (typeof record.routingNumber === "string") patch.routingNumber = record.routingNumber
  if (typeof record.accountNumber === "string") patch.accountNumber = record.accountNumber

  const current = readPayout(session.companyId)
  if (patch.stripeSecret !== undefined || patch.stripePublishable !== undefined) {
    const secret = (patch.stripeSecret ?? current.stripeSecret).trim()
    const accepted = await stripeAccountAccepted(secret)
    if (!accepted) return Response.json({ ok: false, reason: "Stripe did not accept that secret key." }, { status: 400 })
  }
  if (patch.paypalClientId !== undefined || patch.paypalSecret !== undefined || patch.paypalMode !== undefined) {
    const clientId = (patch.paypalClientId ?? current.paypalClientId).trim()
    const secret = (patch.paypalSecret ?? current.paypalSecret).trim()
    const live = (patch.paypalMode ?? current.paypalMode) === "live"
    const token = await paypalAccessToken({ clientId, secret, live })
    if (!token) {
      return Response.json(
        { ok: false, reason: "PayPal did not accept those keys. Sandbox keys stay off Live. Live keys need Live turned on." },
        { status: 400 },
      )
    }
  }
  if (patch.paddleApiKey !== undefined || patch.paddleClientToken !== undefined) {
    const apiKey = (patch.paddleApiKey ?? current.paddleApiKey).trim()
    const accepted = await paddleAccountAccepted(apiKey)
    if (!accepted) {
      return Response.json(
        { ok: false, reason: "Paddle did not accept that API key. This is the account that gets paid, not the ScopePipe subscription." },
        { status: 400 },
      )
    }
  }
  const saved = savePayout(session.companyId, patch)
  if (!saved.ok) return Response.json(saved, { status: 400 })
  return Response.json({ ok: true, ...saved.status })
}
