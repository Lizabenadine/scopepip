import { sessionFromRequest } from "@/lib/auth/request"
import { clearSendKeys, readSendKeys, saveSendKeys, sendKeyStatus, type SendKeys } from "@/lib/messaging/keys"
import { paypalAccessToken } from "@/lib/payments/paypal"

export const runtime = "nodejs"

export async function GET(request: Request) {
  const session = await sessionFromRequest(request)
  if (!session || session.role !== "owner") return Response.json({ ok: false }, { status: 401 })
  return Response.json(sendKeyStatus())
}

export async function POST(request: Request) {
  const session = await sessionFromRequest(request)
  if (!session || session.role !== "owner") {
    return Response.json({ ok: false, reason: "Only the owner can save sending keys." }, { status: 401 })
  }
  const body = await request.json().catch(() => null)
  if (!body || typeof body !== "object") return Response.json({ ok: false, reason: "Missing keys." }, { status: 400 })
  const record = body as Record<string, unknown>
  if (
    record.clear === "resend" ||
    record.clear === "twilio" ||
    record.clear === "supabase" ||
    record.clear === "stripe" ||
    record.clear === "paypal" ||
    record.clear === "cron"
  ) {
    clearSendKeys(record.clear)
    return Response.json({ ok: true, ...sendKeyStatus() })
  }
  const patch: Partial<SendKeys> = {}
  if (typeof record.resendKey === "string") patch.resendKey = record.resendKey
  if (typeof record.resendFrom === "string") patch.resendFrom = record.resendFrom
  if (typeof record.twilioSid === "string") patch.twilioSid = record.twilioSid
  if (typeof record.twilioToken === "string") patch.twilioToken = record.twilioToken
  if (typeof record.twilioFrom === "string") patch.twilioFrom = record.twilioFrom
  if (typeof record.supabaseSecret === "string") patch.supabaseSecret = record.supabaseSecret
  if (typeof record.stripeSecret === "string") patch.stripeSecret = record.stripeSecret
  if (typeof record.stripePublishable === "string") patch.stripePublishable = record.stripePublishable
  if (typeof record.stripeWebhookSecret === "string") patch.stripeWebhookSecret = record.stripeWebhookSecret
  if (typeof record.paypalClientId === "string") patch.paypalClientId = record.paypalClientId
  if (typeof record.paypalSecret === "string") patch.paypalSecret = record.paypalSecret
  if (record.paypalMode === "live" || record.paypalMode === "sandbox") patch.paypalMode = record.paypalMode
  if (typeof record.cronSecret === "string") patch.cronSecret = record.cronSecret
  if (patch.paypalClientId !== undefined || patch.paypalSecret !== undefined || patch.paypalMode !== undefined) {
    const current = readSendKeys()
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
  const saved = saveSendKeys(patch)
  if (!saved.ok) return Response.json(saved, { status: 400 })
  return Response.json({ ok: true, ...sendKeyStatus() })
}
