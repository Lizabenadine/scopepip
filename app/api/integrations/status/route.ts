import { sessionFromRequest } from "@/lib/auth/request"
import { googleCalendarConfigured } from "@/lib/calendar/google"
import { companyCamStatus } from "@/lib/companycam/api"
import { sendKeyStatus } from "@/lib/messaging/keys"
import { payoutStatus, readPayout } from "@/lib/payments/payouts"
import { quickBooksConfigured } from "@/lib/quickbooks/invoice"

export const runtime = "nodejs"

export async function GET(request: Request) {
  const session = await sessionFromRequest(request)
  if (!session) return Response.json({ ok: false }, { status: 401 })
  const sending = sendKeyStatus()
  const payouts = payoutStatus(readPayout(session.companyId))
  return Response.json({
    ok: true,
    companyCam: companyCamStatus().connected,
    quickbooks: quickBooksConfigured(),
    googleCalendar: googleCalendarConfigured(),
    facebookLeads: Boolean(process.env.FACEBOOK_VERIFY_TOKEN?.trim()),
    email: sending.email,
    text: sending.text,
    stripe: payouts.stripe,
    paypal: payouts.paypal,
    paddle: payouts.paddle,
    bank: payouts.bank,
    cron: sending.cron,
  })
}
