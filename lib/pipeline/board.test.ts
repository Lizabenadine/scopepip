import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { createSeedState } from "../data/seed.ts"
import { moneyExact } from "../format.ts"
import { buildPipeline, invoiceStatus, nextSalesStage, OPEN_FILTERS } from "./board.ts"

const TODAY = "2026-10-02"

describe("sales and job pipelines", () => {
  it("splits open leads into the five sales columns", () => {
    const columns = buildPipeline(createSeedState(), "sales", OPEN_FILTERS, TODAY)
    const ids = Object.fromEntries(columns.map((column) => [column.id, column.cards.map((card) => card.estimateId)]))
    assert.deepEqual(ids.cold, ["est-maya", "est-sam"])
    assert.deepEqual(ids.warm, ["est-wade"])
    assert.deepEqual(ids.estimate_requested, ["est-nina"])
    assert.deepEqual(ids.estimate_scheduled, ["est-cole"])
    assert.deepEqual(ids.proposal_sent, ["est-ortiz"])
    assert.equal(columns.find((column) => column.id === "cold")?.cards[0]?.clientName, "Maya Chen")
  })

  it("places accepted work on the jobs pipeline", () => {
    const columns = buildPipeline(createSeedState(), "jobs", OPEN_FILTERS, TODAY)
    const ids = Object.fromEntries(columns.map((column) => [column.id, column.cards.map((card) => card.estimateId)]))
    assert.deepEqual(ids.project_accepted, ["est-dental"])
    assert.deepEqual(ids.project_scheduled, ["est-lena"])
    assert.deepEqual(ids.project_in_progress, ["est-rosa"])
    assert.deepEqual(ids.project_completed, ["est-jim"])
    assert.equal(columns.map((column) => column.label).join("|"), "Project Accepted|Project Scheduled|Project In Progress|Project Completed")
  })

  it("sums each column into a footer total", () => {
    const [accepted] = buildPipeline(createSeedState(), "jobs", OPEN_FILTERS, TODAY)
    assert.ok(accepted)
    assert.equal(accepted.total, accepted.cards[0]?.total)
    assert.match(moneyExact(accepted.total), /^\$\d{1,3}(,\d{3})*\.\d{2}$/)
    const sales = buildPipeline(createSeedState(), "sales", OPEN_FILTERS, TODAY)
    const cold = sales.find((column) => column.id === "cold")
    assert.ok(cold)
    const summed = Math.round(cold.cards.reduce((sum, card) => sum + card.total, 0) * 100) / 100
    assert.equal(cold.total, summed)
    assert.ok(cold.total > 0)
  })

  it("filters by lead source, salesperson, and date", () => {
    const state = createSeedState()
    const thumbtack = buildPipeline(state, "sales", { ...OPEN_FILTERS, leadSource: "thumbtack" }, TODAY)
    const salesIds = thumbtack.flatMap((column) => column.cards.map((card) => card.estimateId))
    assert.deepEqual(salesIds.sort(), ["est-cole", "est-maya"])
    const riley = buildPipeline(state, "jobs", { ...OPEN_FILTERS, salesperson: "Riley Cho" }, TODAY)
    assert.deepEqual(
      riley.flatMap((column) => column.cards.map((card) => card.estimateId)).sort(),
      ["est-dental", "est-jim"],
    )
    const recent = buildPipeline(state, "sales", { ...OPEN_FILTERS, dateRange: "30" }, TODAY)
    const recentIds = recent.flatMap((column) => column.cards.map((card) => card.estimateId))
    assert.equal(recentIds.includes("est-sam"), false)
    assert.equal(recentIds.includes("est-maya"), true)
  })

  it("advances a sales column and drops an archived deal", () => {
    assert.equal(nextSalesStage("cold"), "warm")
    assert.equal(nextSalesStage("proposal_sent"), null)
    const state = createSeedState()
    const maya = state.estimates.find((item) => item.id === "est-maya")
    assert.ok(maya)
    maya.archived = true
    const columns = buildPipeline(state, "sales", OPEN_FILTERS, TODAY)
    const ids = columns.flatMap((column) => column.cards.map((card) => card.estimateId))
    assert.equal(ids.includes("est-maya"), false)
  })

  it("describes invoice balance from acceptance and deposits", () => {
    const state = createSeedState()
    const maya = state.estimates.find((item) => item.id === "est-maya")
    const dental = state.estimates.find((item) => item.id === "est-dental")
    assert.ok(maya && dental)
    assert.equal(invoiceStatus(maya, 1200), "Not invoiced")
    assert.equal(invoiceStatus(dental, 787.5), "Balance due $787.50")
    assert.equal(
      invoiceStatus(
        {
          ...dental,
          paymentStatus: "deposit_paid",
          depositReceipt: {
            paymentIntentId: "pi_test",
            amount: 236.25,
            currency: "usd",
            depositPercent: 30,
            method: "card",
            paidAt: "2026-10-02T12:00:00.000Z",
          },
        },
        787.5,
      ),
      "Invoice balance $551.25",
    )
  })
})
