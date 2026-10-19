import { writeCalendarSnapshot, readCalendarSnapshot, isFeedToken } from "@/lib/calendar/feed"
import { pushGoogleCalendar } from "@/lib/calendar/google"
import type { CalendarEvent } from "@/lib/calendar/events"

export const runtime = "nodejs"

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null)
    const record = body && typeof body === "object" ? (body as { token?: unknown; events?: unknown }) : {}
    const events = Array.isArray(record.events) ? record.events.filter(isEvent) : []
    const snapshot = writeCalendarSnapshot(events, typeof record.token === "string" ? record.token : undefined, new Date().toISOString())
    const google = await pushGoogleCalendar(snapshot.events)
    return Response.json({
      ok: true,
      token: snapshot.token,
      count: snapshot.events.length,
      updatedAt: snapshot.updatedAt,
      feedPath: `/api/calendar/feed/${snapshot.token}`,
      google,
    })
  } catch {
    const current = readCalendarSnapshot()
    return Response.json({
      ok: false,
      token: current && isFeedToken(current.token) ? current.token : "",
      count: 0,
      feedPath: "",
      google: { connected: false, synced: 0, failed: 0, events: [], detail: "The calendar feed could not be saved." },
    })
  }
}

function isEvent(value: unknown): value is CalendarEvent {
  if (!value || typeof value !== "object") return false
  const event = value as CalendarEvent
  return (
    (event.kind === "visit" || event.kind === "job") &&
    typeof event.uid === "string" &&
    typeof event.estimateId === "string" &&
    typeof event.title === "string" &&
    typeof event.location === "string" &&
    typeof event.start === "string" &&
    typeof event.allDay === "boolean"
  )
}
