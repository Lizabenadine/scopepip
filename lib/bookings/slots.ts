import { visitStartInstant, visitTimeLabel } from "../appointments/visit.ts"

export const BOOKING_TIMES = ["09:00", "10:30", "13:00", "15:00"] as const

export type BookingTime = (typeof BOOKING_TIMES)[number]

export function bookingDays(from: Date, count = 10): string[] {
  const days: string[] = []
  const cursor = new Date(from.getFullYear(), from.getMonth(), from.getDate())
  while (days.length < count) {
    if (cursor.getDay() !== 0) days.push(localIso(cursor))
    cursor.setDate(cursor.getDate() + 1)
  }
  return days
}

export function bookingTimeLabel(time: string): string {
  const instant = visitStartInstant("2026-01-06", time)
  return visitTimeLabel(instant) ?? time
}

export function bookingDayLabel(isoDay: string): string {
  const [year, month, day] = isoDay.split("-").map(Number)
  return new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric" }).format(
    new Date(year, (month ?? 1) - 1, day ?? 1),
  )
}

export function bookingPath(token: string): string {
  return `/book/${token}`
}

export function bookingLink(token: string): string {
  if (typeof window === "undefined" || !window.location?.origin) return bookingPath(token)
  return `${window.location.origin}${bookingPath(token)}`
}

function localIso(date: Date): string {
  const month = `${date.getMonth() + 1}`.padStart(2, "0")
  const day = `${date.getDate()}`.padStart(2, "0")
  return `${date.getFullYear()}-${month}-${day}`
}
