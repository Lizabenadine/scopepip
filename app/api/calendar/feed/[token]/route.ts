import { calendarIcs } from "@/lib/calendar/ics"
import { isFeedToken, readCalendarSnapshot } from "@/lib/calendar/feed"

export const runtime = "nodejs"

export async function GET(_request: Request, context: { params: Promise<{ token: string }> }) {
  const { token } = await context.params
  if (!isFeedToken(token)) return new Response("Not found", { status: 404 })
  const snapshot = readCalendarSnapshot()
  if (!snapshot || snapshot.token !== token) return new Response("Not found", { status: 404 })
  return new Response(calendarIcs(snapshot.events, snapshot.updatedAt), {
    headers: { "content-type": "text/calendar; charset=utf-8" },
  })
}
