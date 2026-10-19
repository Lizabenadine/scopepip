import { addBookingSpool } from "./spool.ts"
import { isBookingTime, type PublicBooking } from "./apply.ts"

const TOKEN = /^[a-z0-9]{6,40}$/i
const DAY = /^(\d{4})-(\d{2})-(\d{2})$/

export function acceptBooking(body: unknown, now = new Date()): PublicBooking | { reason: string } {
  const record = body && typeof body === "object" ? (body as Record<string, unknown>) : null
  if (!record) return { reason: "Choose a day and a start time." }
  const token = typeof record.token === "string" ? record.token.trim() : ""
  const visitDay = typeof record.visitDay === "string" ? record.visitDay.trim() : ""
  const visitTime = typeof record.visitTime === "string" ? record.visitTime.trim() : ""
  if (!TOKEN.test(token) || !openDay(visitDay, now) || !isBookingTime(visitTime)) {
    return { reason: "Choose a day and a start time." }
  }
  const booking: PublicBooking = {
    id: `${token}|${visitDay}|${visitTime}`,
    token,
    visitDay,
    visitTime,
    createdAt: now.toISOString(),
  }
  addBookingSpool(booking)
  return booking
}

function openDay(visitDay: string, now: Date): boolean {
  const match = DAY.exec(visitDay)
  if (!match) return false
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const target = Date.UTC(year, month - 1, day)
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  const delta = (target - today) / 86_400_000
  return delta >= -1 && delta <= 60
}
