import { visitStartInstant } from "../appointments/visit.ts"
import type { ScopeState } from "../data/seed.ts"
import { stopPursuit } from "../follow-ups/schedule.ts"
import { salesStageOf } from "../pipeline/board.ts"
import type { Estimate } from "../types.ts"
import { BOOKING_TIMES, type BookingTime } from "./slots.ts"

export interface PublicBooking {
  id: string
  token: string
  visitDay: string
  visitTime: BookingTime
  createdAt: string
}

const OPENS_VISIT = new Set(["cold", "warm", "estimate_requested", "estimate_scheduled"])

export function applyPublicBooking(state: ScopeState, booking: PublicBooking, now: string): ScopeState {
  const estimate = state.estimates.find((item) => item.publicToken === booking.token)
  if (!estimate) return state
  const column = salesStageOf(estimate)
  if (!column || !OPENS_VISIT.has(column)) return state
  const instant = visitStartInstant(booking.visitDay, booking.visitTime)
  if (!instant) return state
  if (estimate.estimateVisitAt === instant && column === "estimate_scheduled") return state
  const next = bookedEstimate(estimate, booking.visitDay, instant, now)
  return {
    ...state,
    estimates: state.estimates.map((item) => (item.id === estimate.id ? next : item)),
  }
}

function bookedEstimate(estimate: Estimate, visitDay: string, instant: string, now: string): Estimate {
  return {
    ...estimate,
    estimateVisitOn: visitDay,
    estimateVisitAt: instant,
    salesStage: "estimate_scheduled",
    followUp: stopPursuit(estimate.followUp),
    updatedAt: now,
  }
}

export function isBookingTime(value: string): value is BookingTime {
  return BOOKING_TIMES.some((time) => time === value)
}
