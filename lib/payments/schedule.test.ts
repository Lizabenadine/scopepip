import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { laborPaymentSchedule, SURFACES_FOR_SIDE } from "./schedule.ts"

describe("laborPaymentSchedule", () => {
  it("turns surface quantity and coats into hours, labor cost, and a 30/50/20 schedule", () => {
    const result = laborPaymentSchedule({
      surfaces: [
        { surfaceType: "drywall", quantity: 200, productionRate: 200, coats: 2 },
        { surfaceType: "trim_linear", quantity: 40, productionRate: 50, coats: 1 },
        { surfaceType: "doors", quantity: 3, productionRate: 0, coats: 2 },
      ],
    })
    assert.equal(result.ok, true)
    if (!result.ok) return
    assert.equal(result.schedule.totalLaborHours, 2.8)
    assert.equal(result.schedule.totalCost, 182)
    assert.deepEqual(
      result.schedule.milestones.map((milestone) => [milestone.id, milestone.percentage, milestone.amount, milestone.trigger]),
      [
        ["deposit", 30, 54.6, "acceptance"],
        ["start", 50, 91, "job_start"],
        ["completion", 20, 36.4, "job_completion"],
      ],
    )
    const collected = result.schedule.milestones.reduce((sum, milestone) => sum + milestone.amount, 0)
    assert.equal(Math.round(collected * 100) / 100, result.schedule.totalCost)
  })

  it("prices the default drywall and trim rows at $65", () => {
    const result = laborPaymentSchedule({
      surfaces: [
        { surfaceType: "drywall", quantity: 1200, productionRate: 150, coats: 2 },
        { surfaceType: "trim_linear", quantity: 250, productionRate: 80, coats: 2 },
      ],
      hourlyRate: 65,
    })
    assert.equal(result.ok, true)
    if (!result.ok) return
    assert.equal(result.schedule.totalLaborHours, 22.25)
    assert.equal(result.schedule.totalCost, 1446.25)
    assert.deepEqual(
      result.schedule.milestones.map((milestone) => milestone.amount),
      [433.88, 723.13, 289.24],
    )
  })

  it("keeps drywall on interior rows and siding on exterior rows", () => {
    assert.equal(SURFACES_FOR_SIDE.interior.includes("drywall"), true)
    assert.equal(SURFACES_FOR_SIDE.exterior.includes("drywall"), false)
    assert.equal(SURFACES_FOR_SIDE.exterior[0], "siding")
  })

  it("rejects a missing surface list and percentages that do not collect the whole job", () => {
    assert.equal(laborPaymentSchedule({ surfaces: null }).ok, false)
    const split = laborPaymentSchedule({
      surfaces: [],
      depositPct: 40,
      progressPct: 40,
      completionPct: 40,
    })
    assert.equal(split.ok, false)
  })
})
