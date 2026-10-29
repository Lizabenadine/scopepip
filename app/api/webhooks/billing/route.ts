import { saveBillingStatus } from "@/lib/auth/directory"
import { billingSignatureMatches, readBillingEvent } from "@/lib/billing/webhook"

export const runtime = "nodejs"

export async function POST(request: Request) {
  const secret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET?.trim() || ""
  const raw = await request.text()
  const signature = request.headers.get("x-signature")?.trim() || ""
  if (!billingSignatureMatches(raw, signature, secret)) {
    return Response.json({ ok: false, reason: "This billing webhook was not signed." }, { status: 401 })
  }
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return Response.json({ ok: false, reason: "The billing event could not be read." }, { status: 400 })
  }
  const event = readBillingEvent(parsed)
  if ("ignored" in event) return Response.json({ ok: true, ignored: true })
  if ("error" in event) return Response.json({ ok: false, reason: event.error }, { status: 400 })
  try {
    const saved = await saveBillingStatus({
      userId: event.userId,
      officeUserId: event.officeUserId,
      email: event.email,
      status: event.status,
      trialEndsAt: event.trialEndsAt,
    })
    return Response.json({ ok: true, matched: saved.account || saved.profile })
  } catch {
    return Response.json({ ok: false, reason: "The subscription could not be saved." }, { status: 502 })
  }
}
