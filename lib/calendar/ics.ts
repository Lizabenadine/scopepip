import type { CalendarEvent } from "./events.ts"

export function calendarIcs(events: CalendarEvent[], stampedAt: string): string {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//ScopePipe//Calendar//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:ScopePipe",
  ]
  for (const event of events) {
    lines.push("BEGIN:VEVENT", `UID:${event.uid}@scopepipe`, `DTSTAMP:${icsInstant(stampedAt)}`, `SUMMARY:${icsText(event.title)}`)
    if (event.location) lines.push(`LOCATION:${icsText(event.location)}`)
    if (event.allDay) {
      const day = event.start.slice(0, 10).replace(/-/g, "")
      lines.push(`DTSTART;VALUE=DATE:${day}`, `DTEND;VALUE=DATE:${nextDate(event.start.slice(0, 10))}`)
    } else {
      lines.push(`DTSTART:${icsInstant(event.start)}`, `DTEND:${icsInstant(plusHour(event.start))}`)
    }
    lines.push("END:VEVENT")
  }
  lines.push("END:VCALENDAR")
  return `${lines.join("\r\n")}\r\n`
}

function icsText(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;")
}

function icsInstant(iso: string): string {
  const ms = Date.parse(iso)
  const safe = Number.isFinite(ms) ? new Date(ms) : new Date()
  return safe.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z")
}

function plusHour(iso: string): string {
  const ms = Date.parse(iso)
  if (!Number.isFinite(ms)) return iso
  return new Date(ms + 60 * 60 * 1000).toISOString()
}

function nextDate(isoDay: string): string {
  const [year, month, day] = isoDay.split("-").map(Number)
  const date = new Date(Date.UTC(year || 1970, (month || 1) - 1, day || 1))
  date.setUTCDate(date.getUTCDate() + 1)
  return date.toISOString().slice(0, 10).replace(/-/g, "")
}
