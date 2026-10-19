import fs from "node:fs"
import path from "node:path"
import { isBookingTime, type PublicBooking } from "./apply.ts"

function spoolFile(): string {
  return process.env.BOOKING_SPOOL_PATH || path.join(process.cwd(), "data", "booking-spool.json")
}

export function readBookingSpool(): PublicBooking[] {
  try {
    const raw = fs.readFileSync(spoolFile(), "utf8")
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(isPublicBooking)
  } catch {
    return []
  }
}

export function addBookingSpool(booking: PublicBooking): PublicBooking[] {
  const current = readBookingSpool()
  if (current.some((item) => item.id === booking.id)) return current
  const next = [...current, booking].slice(-200)
  writeSpool(next)
  return next
}

export function ackBookingSpool(ids: string[]): PublicBooking[] {
  const drop = new Set(ids)
  const next = readBookingSpool().filter((booking) => !drop.has(booking.id))
  writeSpool(next)
  return next
}

function writeSpool(bookings: PublicBooking[]) {
  const file = spoolFile()
  fs.mkdirSync(path.dirname(file), { recursive: true })
  fs.writeFileSync(file, JSON.stringify(bookings))
}

function isPublicBooking(value: unknown): value is PublicBooking {
  if (!value || typeof value !== "object") return false
  const booking = value as PublicBooking
  return (
    typeof booking.id === "string" &&
    typeof booking.token === "string" &&
    typeof booking.visitDay === "string" &&
    typeof booking.visitTime === "string" &&
    isBookingTime(booking.visitTime) &&
    typeof booking.createdAt === "string"
  )
}
