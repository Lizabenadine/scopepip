import assert from "node:assert/strict"
import { mkdtempSync, readFileSync } from "node:fs"
import { tmpdir } from "node:os"
import path from "node:path"
import { describe, it } from "node:test"
import { visitStartInstant } from "../appointments/visit.ts"
import { createSeedState } from "../data/seed.ts"
import { reconcileFollowUps } from "../follow-ups/schedule.ts"
import { applyPublicBooking } from "./apply.ts"
import { acceptBooking } from "./receive.ts"
import { bookingDays } from "./slots.ts"
import { ackBookingSpool, readBookingSpool } from "./spool.ts"

const NOW = "2026-10-18T16:00:00.000Z"

describe("public booking", () => {
  it("offers weekdays and Saturday, and skips Sunday", () => {
    const days = bookingDays(new Date(2026, 9, 18), 10)
    assert.equal(days[0], "2026-10-19")
    assert.equal(days.includes("2026-10-18"), false)
    assert.equal(days.includes("2026-10-25"), false)
    assert.equal(days.length, 10)
  })

  it("moves a cold lead to Estimate Scheduled at the chosen start time", () => {
    const enrolled = reconcileFollowUps(createSeedState(), "2026-10-18T15:00:00.000Z")
    const booking = {
      id: "b19f6d3e8c45|2026-10-21|09:00",
      token: "b19f6d3e8c45",
      visitDay: "2026-10-21",
      visitTime: "09:00" as const,
      createdAt: NOW,
    }
    const next = applyPublicBooking(enrolled, booking, NOW)
    const maya = next.estimates.find((estimate) => estimate.id === "est-maya")
    assert.equal(maya?.salesStage, "estimate_scheduled")
    assert.equal(maya?.estimateVisitOn, "2026-10-21")
    assert.equal(maya?.estimateVisitAt, visitStartInstant("2026-10-21", "09:00"))
    assert.equal(maya?.followUp?.stoppedReason, "visit_booked")
    const reconciled = reconcileFollowUps(next, NOW)
    const scheduled = reconciled.estimates.find((estimate) => estimate.id === "est-maya")
    assert.equal(scheduled?.followUp?.stage, "estimate_scheduled")
    assert.equal(scheduled?.followUp?.status, "active")
    assert.equal(applyPublicBooking(reconciled, booking, NOW), reconciled)
  })

  it("leaves an accepted job off the booking page", () => {
    const state = createSeedState()
    const next = applyPublicBooking(
      state,
      { id: "lena", token: "f0c5b8e21a67", visitDay: "2026-10-21", visitTime: "13:00", createdAt: NOW },
      NOW,
    )
    assert.equal(next, state)
  })

  it("stores one booking for a token, day, and time", () => {
    const directory = mkdtempSync(path.join(tmpdir(), "scopepipe-book-"))
    process.env.BOOKING_SPOOL_PATH = path.join(directory, "spool.json")
    const now = new Date("2026-10-18T16:00:00.000Z")
    const booked = acceptBooking({ token: "b19f6d3e8c45", visitDay: "2026-10-21", visitTime: "09:00" }, now)
    assert.equal("token" in booked, true)
    acceptBooking({ token: "b19f6d3e8c45", visitDay: "2026-10-21", visitTime: "09:00" }, now)
    assert.equal(readBookingSpool().length, 1)
    assert.equal(readFileSync(process.env.BOOKING_SPOOL_PATH, "utf8").includes("b19f6d3e8c45"), true)
    assert.equal("reason" in acceptBooking({ token: "b19f6d3e8c45", visitDay: "2026-10-21", visitTime: "03:00" }, now), true)
    ackBookingSpool(["b19f6d3e8c45|2026-10-21|09:00"])
    assert.equal(readBookingSpool().length, 0)
    delete process.env.BOOKING_SPOOL_PATH
  })
})
