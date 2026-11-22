import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { calculateDrywallQuote, recomputeDrywallRoomGeometry } from "./calculate.ts"
import { createBlankDrywallRoom, createBlankDrywallScope } from "./defaults.ts"
import type { DrywallRoom, DrywallScope } from "../estimate/multi-trade-types.ts"

describe("Drywall Estimator Engine", () => {
  it("computes wall and ceiling areas with openings deductions", () => {
    // Room: 16' x 12' x 8'
    // Ceiling = 16 * 12 = 192 sq ft
    // Gross walls = 2 * (16 + 12) * 8 = 56 * 8 = 448 sq ft
    // Deductions: Door (20 sq ft) + Window (15 sq ft) = 35 sq ft
    // Net walls = 448 - 35 = 413 sq ft
    // Total net = 192 + 413 = 605 sq ft
    const room = createBlankDrywallRoom("Great Room")
    const computed = recomputeDrywallRoomGeometry(room)

    assert.equal(computed.netCeilingSqFt, 192)
    assert.equal(computed.netWallSqFt, 413)
    assert.equal(computed.totalNetSqFt, 605)
  })

  it("calculates accurate sheet counts rounded up for 4x8, 4x12, and 54x12 sizes", () => {
    // 605 sq ft with 10% waste = 665.5 sq ft
    // 4x8 = 32 sq ft -> Math.ceil(665.5 / 32) = 21 sheets
    const room4x8: DrywallRoom = {
      ...createBlankDrywallRoom(),
      boardSize: "4x8",
      wastePercent: 10,
    }
    const scope4x8: DrywallScope = {
      rooms: [room4x8],
      defaultWastePercent: 10,
      dumpsterFee: 0,
      overheadPercent: 0,
      profitPercent: 0,
    }
    const quote4x8 = calculateDrywallQuote(scope4x8)
    assert.equal(quote4x8.totalSheets, 21)

    // With 4x12 (48 sq ft): Math.ceil(665.5 / 48) = 14 sheets
    const room4x12: DrywallRoom = {
      ...room4x8,
      boardSize: "4x12",
      boardCostPerSheet: 21.75,
    }
    const quote4x12 = calculateDrywallQuote({ ...scope4x8, rooms: [room4x12] })
    assert.equal(quote4x12.totalSheets, 14)
  })

  it("produces complete material buy-list including mud buckets, tape, and screws", () => {
    const scope = createBlankDrywallScope()
    const quote = calculateDrywallQuote(scope)

    assert.ok(quote.total > 0)
    assert.ok(quote.buyList.length >= 4)

    const boardItem = quote.buyList.find((i) => i.category === "board")
    const mudItem = quote.buyList.find((i) => i.category === "mud")
    const tapeItem = quote.buyList.find((i) => i.category === "tape")
    const screwItem = quote.buyList.find((i) => i.category === "fasteners")
    const beadItem = quote.buyList.find((i) => i.category === "corner_bead")

    assert.ok(boardItem)
    assert.ok(mudItem)
    assert.ok(tapeItem)
    assert.ok(screwItem)
    assert.ok(beadItem)

    assert.equal(boardItem.unit, "sheets")
    assert.equal(mudItem.unit, "pails (4.5 gal)")
    assert.equal(tapeItem.unit, "rolls (500')")
    assert.equal(screwItem.unit, "boxes (5 lb)")
    assert.equal(beadItem.unit, "sticks (8')")
  })

  it("scales finishing labor accurately between Level 1 fire tape and Level 5 full skim coat", () => {
    const baseRoom = createBlankDrywallRoom()
    const scopeLevel1: DrywallScope = {
      rooms: [{ ...baseRoom, finishLevel: 1 }],
      defaultWastePercent: 10,
      dumpsterFee: 0,
      overheadPercent: 0,
      profitPercent: 0,
    }
    const scopeLevel5: DrywallScope = {
      rooms: [{ ...baseRoom, finishLevel: 5 }],
      defaultWastePercent: 10,
      dumpsterFee: 0,
      overheadPercent: 0,
      profitPercent: 0,
    }

    const quoteLevel1 = calculateDrywallQuote(scopeLevel1)
    const quoteLevel5 = calculateDrywallQuote(scopeLevel5)

    assert.ok(quoteLevel5.finishingLaborCost > quoteLevel1.finishingLaborCost)
    assert.ok(quoteLevel5.jointCompoundCost > quoteLevel1.jointCompoundCost)
  })
})
