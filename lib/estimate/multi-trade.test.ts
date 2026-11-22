import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { activeTrades, calculateMultiTradeQuote, isMultiTrade } from "./multi-trade.ts"
import { createSeedState } from "../data/seed.ts"
import { createBlankFlooringScope } from "../flooring/defaults.ts"
import { createBlankDrywallScope } from "../drywall/defaults.ts"
import type { Estimate } from "../types.ts"

describe("Multi-Trade Estimating Platform", () => {
  it("defaults backward-compatible estimates to painting trade", () => {
    const seed = createSeedState().estimates[0]!
    assert.deepEqual(activeTrades(seed), ["painting"])
    assert.equal(isMultiTrade(seed), false)
  })

  it("calculates accurate single-trade quotes for flooring and drywall", () => {
    const seed = createSeedState().estimates[0]!

    // Flooring only
    const flooringEstimate: Estimate = {
      ...seed,
      trades: ["flooring"],
      flooringScope: createBlankFlooringScope(),
    }
    assert.deepEqual(activeTrades(flooringEstimate), ["flooring"])
    const flooringQuote = calculateMultiTradeQuote(flooringEstimate)
    assert.equal(flooringQuote.multiTradeQuote.paintingTotal, 0)
    assert.ok(flooringQuote.multiTradeQuote.flooringTotal > 0)
    assert.equal(flooringQuote.multiTradeQuote.drywallTotal, 0)
    assert.equal(flooringQuote.multiTradeQuote.combinedTotal, flooringQuote.multiTradeQuote.flooringTotal)

    // Drywall only
    const drywallEstimate: Estimate = {
      ...seed,
      trades: ["drywall"],
      drywallScope: createBlankDrywallScope(),
    }
    assert.deepEqual(activeTrades(drywallEstimate), ["drywall"])
    const drywallQuote = calculateMultiTradeQuote(drywallEstimate)
    assert.equal(drywallQuote.multiTradeQuote.paintingTotal, 0)
    assert.equal(drywallQuote.multiTradeQuote.flooringTotal, 0)
    assert.ok(drywallQuote.multiTradeQuote.drywallTotal > 0)
    assert.equal(drywallQuote.multiTradeQuote.combinedTotal, drywallQuote.multiTradeQuote.drywallTotal)
  })

  it("combines Painting, Flooring, and Drywall into one unified proposal total", () => {
    const seed = createSeedState().estimates[0]!
    const multiEstimate: Estimate = {
      ...seed,
      trades: ["painting", "flooring", "drywall"],
      flooringScope: createBlankFlooringScope(),
      drywallScope: createBlankDrywallScope(),
    }

    assert.equal(isMultiTrade(multiEstimate), true)
    const result = calculateMultiTradeQuote(multiEstimate)

    assert.ok(result.multiTradeQuote.paintingTotal > 0)
    assert.ok(result.multiTradeQuote.flooringTotal > 0)
    assert.ok(result.multiTradeQuote.drywallTotal > 0)

    const expectedSum = Number(
      (
        result.multiTradeQuote.paintingTotal +
        result.multiTradeQuote.flooringTotal +
        result.multiTradeQuote.drywallTotal
      ).toFixed(2)
    )
    assert.equal(result.multiTradeQuote.combinedTotal, expectedSum)
    assert.equal(result.multiTradeQuote.tradeSummaries.length, 3)

    // Verify deposit & balance calculations
    assert.equal(
      Number((result.multiTradeQuote.depositAmount + result.multiTradeQuote.balanceAmount).toFixed(2)),
      expectedSum
    )

    // Verify buy-list contains both flooring and drywall items
    assert.ok(result.multiTradeQuote.combinedBuyList.length >= 2)
  })
})
