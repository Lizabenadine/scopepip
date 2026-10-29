import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { buildHourlyRate } from "./hourly-rate.ts"

describe("hourly rate builder", () => {
  it("builds the selling rate from labor, overhead, paint, and a profit margin", () => {
    const built = buildHourlyRate({
      laborCostPerHour: 21.5,
      overheadPerHour: 22.58,
      sundriesPerHour: 9.67,
      profitPercent: 10,
    })
    assert.deepEqual(built, { ok: true, hourlyRate: 59.72 })
  })

  it("leaves paint out when the estimate prices materials on its own", () => {
    const built = buildHourlyRate({
      laborCostPerHour: 30,
      overheadPerHour: 15,
      sundriesPerHour: 0,
      profitPercent: 20,
    })
    assert.deepEqual(built, { ok: true, hourlyRate: 56.25 })
  })

  it("rejects a margin that would consume the whole rate", () => {
    const built = buildHourlyRate({
      laborCostPerHour: 25,
      overheadPerHour: 10,
      sundriesPerHour: 0,
      profitPercent: 100,
    })
    assert.equal(built.ok, false)
  })
})
