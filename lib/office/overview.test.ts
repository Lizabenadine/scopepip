import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { createSeedState } from "../data/seed.ts"
import { officeOverview } from "./overview.ts"

describe("office overview", () => {
  it("counts live jobs instead of placeholder totals", () => {
    const state = createSeedState()
    const items = officeOverview(state, new Date("2026-10-18T15:00:00.000Z"), () => 100)
    assert.equal(items.length, 6)
    assert.equal(items.every((item) => Number.isFinite(item.count)), true)
    const awaiting = items.find((item) => item.id === "awaiting")
    assert.equal(awaiting?.href, "/sales-pipeline")
    assert.equal(awaiting?.count, state.estimates.filter((estimate) => estimate.clientStatus === "sent" && !estimate.archived).length)
    const payments = items.find((item) => item.id === "payments")
    assert.equal(payments?.href, "/payments")
    assert.equal(typeof payments?.amount, "number")
  })
})
