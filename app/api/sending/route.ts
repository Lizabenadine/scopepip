import { sessionFromRequest } from "@/lib/auth/request"
import { clearSendKeys, saveSendKeys, sendKeyStatus, type SendKeys } from "@/lib/messaging/keys"

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
  if (typeof record.cronSecret === "string") patch.cronSecret = record.cronSecret
  const saved = saveSendKeys(patch)
  if (!saved.ok) return Response.json(saved, { status: 400 })
  return Response.json({ ok: true, ...sendKeyStatus() })
}
