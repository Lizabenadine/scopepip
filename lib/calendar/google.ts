import type { CalendarEvent } from "./events.ts"

export interface GoogleSyncResult {
  connected: boolean
  synced: number
  failed: number
  events: { uid: string; googleEventId: string }[]
  detail: string
}

export function googleCalendarConfigured(): boolean {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET && process.env.GOOGLE_REFRESH_TOKEN)
}

export async function pushGoogleCalendar(events: CalendarEvent[]): Promise<GoogleSyncResult> {
  if (!googleCalendarConfigured()) {
    return { connected: false, synced: 0, failed: 0, events: [], detail: "Google Calendar push is not connected." }
  }
  try {
    const token = await accessToken()
    const calendarId = encodeURIComponent(process.env.GOOGLE_CALENDAR_ID || "primary")
    const saved: { uid: string; googleEventId: string }[] = []
    let failed = 0
    for (const event of events.slice(0, 40)) {
      try {
        const id = await upsertEvent(calendarId, token, event)
        if (id) saved.push({ uid: event.uid, googleEventId: id })
        else failed += 1
      } catch {
        failed += 1
      }
    }
    return {
      connected: true,
      synced: saved.length,
      failed,
      events: saved,
      detail: failed > 0 ? "Some Google Calendar events were rejected." : "Google Calendar updated.",
    }
  } catch {
    return { connected: true, synced: 0, failed: events.length, events: [], detail: "Google Calendar could not be reached." }
  }
}

async function accessToken(): Promise<string> {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID || "",
      client_secret: process.env.GOOGLE_CLIENT_SECRET || "",
      refresh_token: process.env.GOOGLE_REFRESH_TOKEN || "",
      grant_type: "refresh_token",
    }),
  })
  if (!response.ok) throw new Error("token")
  const payload = (await response.json()) as { access_token?: string }
  if (!payload.access_token) throw new Error("token")
  return payload.access_token
}

async function upsertEvent(calendarId: string, token: string, event: CalendarEvent): Promise<string | null> {
  const existing = event.googleEventId || (await findEvent(calendarId, token, event.uid))
  const response = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events${existing ? `/${encodeURIComponent(existing)}` : ""}`,
    {
      method: existing ? "PATCH" : "POST",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: JSON.stringify(googleBody(event)),
    },
  )
  if (!response.ok) return null
  const payload = (await response.json()) as { id?: string }
  return payload.id || existing || null
}

async function findEvent(calendarId: string, token: string, uid: string): Promise<string | null> {
  const query = new URLSearchParams({ privateExtendedProperty: `scopepipeId=${uid}`, maxResults: "1" })
  const response = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events?${query}`, {
    headers: { authorization: `Bearer ${token}` },
  })
  if (!response.ok) return null
  const payload = (await response.json()) as { items?: { id?: string }[] }
  return payload.items?.[0]?.id ?? null
}

function googleBody(event: CalendarEvent): Record<string, unknown> {
  const end = event.allDay ? nextDay(event.start.slice(0, 10)) : plusHour(event.start)
  return {
    summary: event.title,
    location: event.location,
    start: event.allDay ? { date: event.start.slice(0, 10) } : { dateTime: event.start },
    end: event.allDay ? { date: end } : { dateTime: end },
    extendedProperties: { private: { scopepipeId: event.uid } },
  }
}

function plusHour(iso: string): string {
  const ms = Date.parse(iso)
  if (!Number.isFinite(ms)) return iso
  return new Date(ms + 60 * 60 * 1000).toISOString()
}

function nextDay(isoDay: string): string {
  const [year, month, day] = isoDay.split("-").map(Number)
  const date = new Date(Date.UTC(year || 1970, (month || 1) - 1, day || 1))
  date.setUTCDate(date.getUTCDate() + 1)
  return date.toISOString().slice(0, 10)
}
