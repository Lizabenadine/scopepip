import { sessionFromRequest } from "@/lib/auth/request"
import { googleCalendarConfigured } from "@/lib/calendar/google"
import { getCompanyCamStatus } from "@/lib/companycam/credentials"
import { getFacebookStatus } from "@/lib/facebook/credentials"
import { sendKeyStatus } from "@/lib/messaging/keys"
import { quickBooksConfigured } from "@/lib/quickbooks/invoice"

export const runtime = "nodejs"

export async function GET(request: Request) {
  const session = await sessionFromRequest(request)
  if (!session) return Response.json({ ok: false }, { status: 401 })
  const sending = sendKeyStatus()
  const camStatus = await getCompanyCamStatus(session.companyId)
  const facebookStatus = await getFacebookStatus(session.companyId)
  return Response.json({
    ok: true,
    companyCam: camStatus.connected,
    quickbooks: quickBooksConfigured(),
    googleCalendar: googleCalendarConfigured(),
    facebookLeads: facebookStatus.connected,
    email: sending.email,
    text: sending.text,
    stripe: sending.stripe,
    cron: sending.cron,
  })
}
