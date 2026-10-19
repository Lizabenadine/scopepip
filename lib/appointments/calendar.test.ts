import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { createSeedState } from "../data/seed.ts"
import { dispatchJobs, jobsOnDate } from "../dispatch/board.ts"
import { dueAt, visitDayOf } from "../follow-ups/schedule.ts"
import { defaultSequences } from "../follow-ups/defaults.ts"
import { appointmentsOnDay, listSalesAppointments } from "./calendar.ts"
import { appointmentLabel, localVisitClock, visitStartInstant } from "./visit.ts"

describe("sales appointments", () => {
  it("builds a UTC instant from the local day and start time", () => {
    const instant = visitStartInstant("2026-10-21", "09:00")
    assert.ok(instant)
    const start = new Date(instant)
    assert.equal(start.getFullYear(), 2026)
    assert.equal(start.getMonth(), 9)
    assert.equal(start.getDate(), 21)
    assert.equal(start.getHours(), 9)
    assert.equal(start.getMinutes(), 0)
    assert.equal(localVisitClock(instant), "09:00")
    assert.equal(visitStartInstant("2026-10-21", ""), null)
    assert.equal(visitStartInstant("2026-10-21", "9:00"), null)
  })

  it("counts a before-visit reminder back from the start instant and keeps noon UTC for a day-only visit", () => {
    const step = defaultSequences().find((sequence) => sequence.stage === "estimate_scheduled")!.steps[0]!
    const instant = "2026-10-21T16:00:00.000Z"
    assert.equal(
      dueAt(step, "2026-10-18T15:00:00.000Z", "2026-10-21", null, { visitStartInstant: instant }),
      Date.parse(instant) - 24 * 60 * 60 * 1000,
    )
    assert.equal(
      dueAt(step, "2026-10-18T15:00:00.000Z", "2026-10-21", null),
      Date.UTC(2026, 9, 21, 12) - 24 * 60 * 60 * 1000,
    )
    const job = defaultSequences().find((sequence) => sequence.stage === "project_scheduled")!.steps[0]!
    const jobStart = "2026-10-08T15:00:00.000Z"
    assert.equal(
      dueAt(job, "2026-10-18T15:00:00.000Z", null, "2026-10-08", { jobStartInstant: jobStart }),
      Date.parse(jobStart) - 48 * 60 * 60 * 1000,
    )
    assert.equal(
      dueAt(job, "2026-10-18T15:00:00.000Z", null, "2026-10-08"),
      Date.UTC(2026, 9, 8, 12) - 48 * 60 * 60 * 1000,
    )
  })

  it("lists booked visits with a start time and leaves crew jobs and undated notes off the calendar", () => {
    const state = createSeedState()
    assert.deepEqual(listSalesAppointments(state.estimates, state.clients), [])
    const instant = visitStartInstant("2026-10-21", "09:00")
    const estimates = state.estimates.map((estimate) => {
      if (estimate.id === "est-maya") {
        return { ...estimate, estimateVisitOn: "2026-10-21", estimateVisitAt: instant }
      }
      if (estimate.id === "est-wade") {
        return { ...estimate, notes: `${estimate.notes}\nEstimate visit 2026-11-02` }
      }
      return estimate
    })
    const appointments = listSalesAppointments(estimates, state.clients)
    assert.deepEqual(
      appointments.map((appointment) => appointment.estimateId),
      ["est-maya", "est-wade"],
    )
    const maya = appointments[0]
    assert.equal(maya?.clientName, "Maya Chen")
    assert.equal(maya?.jobAddress, "1842 Birch St, Portland")
    assert.equal(maya?.salesperson, "Jordan Hale")
    assert.equal(maya?.visitDay, "2026-10-21")
    assert.equal(maya?.visitStartInstant, instant)
    assert.match(appointmentLabel(maya!.visitDay, maya!.visitStartInstant), /9:00/)
    const wade = appointments[1]
    assert.equal(wade?.visitDay, "2026-11-02")
    assert.equal(wade?.visitStartInstant, null)
    assert.equal(appointmentsOnDay(appointments, "2026-10-21").length, 1)
    assert.equal(appointments.some((appointment) => appointment.estimateId === "est-cole"), false)
    assert.equal(appointments.some((appointment) => appointment.estimateId === "est-lena"), false)
    const jobs = dispatchJobs({ ...state, estimates })
    assert.equal(jobsOnDate(jobs, "2026-10-21").some((job) => job.estimateId === "est-maya"), false)
    assert.equal(jobsOnDate(jobs, "2026-10-08").some((job) => job.estimateId === "est-lena"), true)
    const cole = estimates.find((estimate) => estimate.id === "est-cole")
    assert.equal(visitDayOf(cole!), null)
  })

  it("prefers the structured visit day over a legacy note line", () => {
    const state = createSeedState()
    const maya = state.estimates.find((estimate) => estimate.id === "est-maya")
    assert.ok(maya)
    assert.equal(
      visitDayOf({
        ...maya,
        estimateVisitOn: "2026-10-21",
        notes: "Estimate visit 2026-10-01",
      }),
      "2026-10-21",
    )
    assert.equal(
      visitDayOf({
        ...maya,
        estimateVisitOn: null,
        notes: "Estimate visit 2026-10-18",
      }),
      "2026-10-18",
    )
  })
})