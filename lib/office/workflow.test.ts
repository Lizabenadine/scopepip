import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { createSeedState } from "../data/seed.ts"
import { jobFlowStep, officeWorklist } from "./workflow.ts"

describe("job workflow", () => {
  it("places a sent proposal on approval and a finished job on payment", () => {
    const state = createSeedState()
    const sent = state.estimates.find((estimate) => estimate.id === "est-ortiz")
    const finished = state.estimates.find((estimate) => estimate.id === "est-jim")
    assert.ok(sent)
    assert.ok(finished)
    if (!sent || !finished) return
    assert.equal(jobFlowStep(sent, undefined, "estimate_sent"), "approval")
    const order = state.workOrders.find((item) => item.estimateId === finished.id)
    assert.equal(jobFlowStep(finished, order, "completed"), "payment")
    const paid = { ...finished, paymentStatus: "paid" as const }
    assert.equal(jobFlowStep(paid, order, "completed"), "payment")
  })

  it("lists live upcoming jobs, open estimates, and unpaid invoices", () => {
    const state = createSeedState()
    const queues = officeWorklist(state, new Date("2026-10-18T15:00:00.000Z"), () => 100)
    assert.ok(queues.upcoming.length > 0)
    assert.equal(queues.upcoming.every((item) => item.href.startsWith("/work-orders/")), true)
    assert.equal(queues.estimates.some((item) => item.id === "est-ortiz"), true)
    assert.ok(queues.invoices.every((item) => (item.amount ?? 0) > 0))
    assert.equal(queues.upcoming.some((item) => item.id === "est-jim"), false)
  })
})
