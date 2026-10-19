import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { createSeedState } from "../data/seed.ts"
import { applyDeposit } from "../payments/apply-deposit.ts"
import { applyAssignment, assignmentNotice, fieldsForCrew, fieldsForStatus } from "./assign.ts"
import { dispatchJobs, jobsOnDate } from "./board.ts"
import { monthGrid, weekDays } from "./calendar.ts"

describe("dispatch board", () => {
  it("places accepted jobs in unscheduled, scheduled, in progress, and complete", () => {
    const jobs = dispatchJobs(createSeedState())
    const byId = Object.fromEntries(jobs.map((job) => [job.estimateId, job]))
    assert.equal(byId["est-dental"].status, "unscheduled")
    assert.equal(byId["est-dental"].address, "18 Market Street, Portland")
    assert.equal(byId["est-lena"].status, "scheduled")
    assert.equal(byId["est-lena"].crewName, "Priya Shah")
    assert.equal(byId["est-lena"].scheduledStartDate, "2026-10-08")
    assert.equal(byId["est-rosa"].status, "in_progress")
    assert.equal(byId["est-rosa"].crewName, "Luis Ortega")
    assert.equal(byId["est-jim"].status, "complete")
    assert.equal(byId["est-ortiz"], undefined)
    assert.equal("total" in byId["est-lena"], false)
    assert.ok(byId["est-lena"].hours > 0)
  })

  it("assigns a crew, writes the start date, and notifies that lead", () => {
    const state = createSeedState()
    const fields = fieldsForCrew(
      { status: "unscheduled", assignedCrewId: null, scheduledStartDate: null },
      null,
      "crew-north",
      "2026-10-06",
    )
    const result = applyAssignment(state, {
      estimateId: "est-dental",
      ...fields,
      notifiedAt: "2026-10-02T18:00:00.000Z",
    })
    assert.equal(result.ok, true)
    if (!result.ok) return
    const order = result.state.workOrders.find((item) => item.estimateId === "est-dental")
    const estimate = result.state.estimates.find((item) => item.id === "est-dental")
    assert.equal(order?.status, "scheduled")
    assert.equal(order?.assignedCrewId, "crew-north")
    assert.equal(order?.scheduledStartDate, "2026-10-06")
    assert.equal(order?.notifiedAt, "2026-10-02T18:00:00.000Z")
    assert.equal(estimate?.stageId, "stage-scheduled")
    assert.equal(estimate?.scheduledOn, "2026-10-06")
    assert.equal(
      result.notice,
      "Avery Cole notified at (503) 555-0101 for Waiting room on Tue, Oct 6.",
    )
    assert.equal(
      jobsOnDate(dispatchJobs(result.state), "2026-10-06").some((job) => job.estimateId === "est-dental"),
      true,
    )
  })

  it("refuses to dispatch a proposal that is still waiting on a signature", () => {
    const result = applyAssignment(createSeedState(), {
      estimateId: "est-ortiz",
      status: "scheduled",
      assignedCrewId: "crew-south",
      scheduledStartDate: "2026-10-06",
      notifiedAt: "2026-10-02T18:00:00.000Z",
    })
    assert.equal(result.ok, false)
    if (result.ok) return
    assert.equal(result.reason, "Accept the proposal before dispatching the crew.")
  })

  it("moves a scheduled job to in progress without dropping the crew", () => {
    const state = createSeedState()
    const current = state.workOrders.find((order) => order.estimateId === "est-lena")
    assert.ok(current)
    const fields = fieldsForStatus(current, "2026-10-08", "in_progress", "2026-10-02")
    const result = applyAssignment(state, {
      estimateId: "est-lena",
      ...fields,
      notifiedAt: "2026-10-02T18:00:00.000Z",
    })
    assert.equal(result.ok, true)
    if (!result.ok) return
    const order = result.state.workOrders.find((item) => item.estimateId === "est-lena")
    assert.equal(order?.status, "in_progress")
    assert.equal(order?.assignedCrewId, "crew-south")
    assert.equal(order?.scheduledStartDate, "2026-10-08")
    assert.match(result.notice, /Lena Brooks is in progress/)
  })

  it("schedules the work order when a deposit is recorded", () => {
    const state = createSeedState()
    const accepted = {
      ...state,
      estimates: state.estimates.map((estimate) =>
        estimate.id === "est-ortiz" ? { ...estimate, clientStatus: "accepted" as const } : estimate,
      ),
    }
    const result = applyDeposit(accepted, "est-ortiz", {
      paymentIntentId: "pi_dispatch",
      amount: 100,
      currency: "usd",
      depositPercent: 30,
      method: "card",
      paidAt: "2026-10-02T23:30:00.000Z",
    })
    assert.equal(result.ok, true)
    if (!result.ok) return
    const order = result.state.workOrders.find((item) => item.estimateId === "est-ortiz")
    assert.equal(order?.status, "scheduled")
    assert.equal(order?.scheduledStartDate, "2026-10-02")
  })
})

describe("crew calendar", () => {
  it("builds October 2026 from the Sunday before the first", () => {
    const cells = monthGrid(new Date(2026, 9, 2))
    assert.equal(cells[0]?.iso, "2026-09-27")
    assert.equal(cells.find((cell) => cell.iso === "2026-10-08")?.inMonth, true)
    assert.deepEqual(weekDays(new Date(2026, 9, 2)), [
      "2026-09-27",
      "2026-09-28",
      "2026-09-29",
      "2026-09-30",
      "2026-10-01",
      "2026-10-02",
      "2026-10-03",
    ])
  })

  it("shows the site and crew on the scheduled day", () => {
    const jobs = jobsOnDate(dispatchJobs(createSeedState()), "2026-10-08")
    assert.equal(jobs.length, 1)
    assert.equal(jobs[0]?.clientName, "Lena Brooks")
    assert.equal(jobs[0]?.address, "22 Cedar Court, Lake Oswego")
    assert.equal(jobs[0]?.crewName, "Priya Shah")
  })
})

describe("assignmentNotice", () => {
  it("names the crew lead when the assignment changes", () => {
    assert.equal(
      assignmentNotice({
        title: "Waiting room",
        clientName: "Harbor Dental",
        status: "scheduled",
        crewName: "Avery Cole",
        crewPhone: "(503) 555-0101",
        scheduledStartDate: "2026-10-06",
        crewChanged: true,
      }),
      "Avery Cole notified at (503) 555-0101 for Waiting room on Tue, Oct 6.",
    )
  })
})
