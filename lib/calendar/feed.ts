import fs from "node:fs"
import path from "node:path"
import type { CalendarEvent } from "./events.ts"

export interface CalendarSnapshot {
  token: string
  updatedAt: string
  events: CalendarEvent[]
}

const TOKEN = /^[a-zA-Z0-9-]{16,80}$/

function snapshotFile(): string {
  return process.env.CALENDAR_FEED_PATH || path.join(process.cwd(), "data", "calendar.json")
}

export function readCalendarSnapshot(): CalendarSnapshot | null {
  try {
    const parsed: unknown = JSON.parse(fs.readFileSync(snapshotFile(), "utf8"))
    if (!parsed || typeof parsed !== "object") return null
    const snapshot = parsed as CalendarSnapshot
    if (!TOKEN.test(snapshot.token) || !Array.isArray(snapshot.events)) return null
    return snapshot
  } catch {
    return null
  }
}

export function writeCalendarSnapshot(events: CalendarEvent[], token: string | undefined, updatedAt: string): CalendarSnapshot {
  const current = readCalendarSnapshot()
  const nextToken = current?.token || (token && TOKEN.test(token) ? token : crypto.randomUUID())
  const snapshot: CalendarSnapshot = {
    token: nextToken,
    updatedAt,
    events: events.slice(0, 60).map((event) => ({
      uid: event.uid,
      kind: event.kind,
      estimateId: event.estimateId,
      title: event.title.slice(0, 180),
      location: event.location.slice(0, 240),
      start: event.start,
      allDay: event.allDay,
      googleEventId: event.googleEventId,
    })),
  }
  const file = snapshotFile()
  fs.mkdirSync(path.dirname(file), { recursive: true })
  fs.writeFileSync(file, JSON.stringify(snapshot))
  return snapshot
}

export function isFeedToken(value: string): boolean {
  return TOKEN.test(value)
}
