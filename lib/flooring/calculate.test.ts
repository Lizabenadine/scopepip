import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { calculateFlooringQuote, recomputeRoomGeometry } from "./calculate.ts"
import { createBlankFlooringRoom, createBlankFlooringScope } from "./defaults.ts"
import type { FlooringRoom, FlooringScope } from "../estimate/multi-trade-types.ts"

describe("Flooring Estimator Engine", () => {
  it("recomputes room geometry with feet-and-inches and deductions", () => {
    // 20' 0" x 15' 0" = 300 sq ft gross, perimeter = 70 ft
    // Island deduction: 6' 0" x 4' 0" = 24 sq ft
    // Net should be 300 - 24 = 276 sq ft
    const room: FlooringRoom = {
      ...createBlankFlooringRoom("Kitchen"),
      length: { feet: 20, inches: 0 },
      width: { feet: 15, inches: 0 },
      deductions: [
        {
          id: "island",
          name: "Kitchen Island",
          length: { feet: 6, inches: 0 },
          width: { feet: 4, inches: 0 },
          sqFt: 24,
        },
      ],
      additionsSqFt: 0,
    }

    const calculated = recomputeRoomGeometry(room)
    assert.equal(calculated.grossSqFt, 300)
    assert.equal(calculated.netSqFt, 276)
    assert.equal(calculated.perimeterFt, 70)
  })

  it("calculates accurate box quantities rounded up to whole cartons", () => {
    // Room: 10' x 10' = 100 sq ft
    // Waste: 10% -> 110 sq ft needed
    // 23.8 sq ft per box -> 110 / 23.8 = 4.62 -> 5 boxes
    const room: FlooringRoom = {
      ...createBlankFlooringRoom("Bed 1"),
      length: { feet: 10, inches: 0 },
      width: { feet: 10, inches: 0 },
      deductions: [],
      additionsSqFt: 0,
      sqFtPerBox: 23.8,
      wastePercent: 10,
      materialCostPerSqFt: 3.5,
      installCostPerSqFt: 2.0,
      underlaymentType: "none",
      removeExistingType: "none",
      subfloorPrepType: "none",
      includeBaseboard: false,
      includeQuarterRound: false,
      transitions: [],
    }

    const scope: FlooringScope = {
      rooms: [room],
      defaultWastePercent: 10,
      dumpsterFee: 0,
      overheadPercent: 0,
      profitPercent: 0,
    }

    const quote = calculateFlooringQuote(scope)
    assert.equal(quote.netSqFt, 100)
    assert.equal(quote.totalBoxes, 5)

    // 5 boxes * 23.8 sq ft = 119 purchasing sq ft * $3.50 = $416.50
    assert.equal(quote.materialCost, 416.5)
    // Labor: 100 net sq ft * $2.00 = $200.00
    assert.equal(quote.laborCost, 200)
    assert.equal(quote.total, 616.5)

    // Check buy-list
    const boxItem = quote.buyList.find((item) => item.category === "flooring")
    assert.ok(boxItem)
    assert.equal(boxItem.purchasingQuantity, 5)
    assert.equal(boxItem.unit, "boxes")
  })

  it("calculates tile assemblies with mortar, grout, and backerboard", () => {
    // 10' x 10' = 100 sq ft bathroom
    const room: FlooringRoom = {
      ...createBlankFlooringRoom("Bathroom"),
      length: { feet: 10, inches: 0 },
      width: { feet: 10, inches: 0 },
      deductions: [],
      additionsSqFt: 0,
      materialType: "tile_porcelain",
      sqFtPerBox: 15,
      wastePercent: 12,
      materialCostPerSqFt: 4.5,
      installCostPerSqFt: 6.5,
      underlaymentType: "cement_backer",
      underlaymentCostPerSqFt: 1.25,
      removeExistingType: "tile",
      removeCostPerSqFt: 2.5,
      subfloorPrepType: "self_leveler",
      subfloorCostPerSqFt: 0.85,
      includeBaseboard: false,
      includeQuarterRound: false,
      transitions: [],
    }

    const scope: FlooringScope = {
      rooms: [room],
      defaultWastePercent: 12,
      dumpsterFee: 150,
      overheadPercent: 10,
      profitPercent: 15,
    }

    const quote = calculateFlooringQuote(scope)
    assert.equal(quote.netSqFt, 100)
    assert.ok(quote.totalBoxes > 0)
    assert.ok(quote.demoCost > 0)
    assert.ok(quote.prepCost > 0)

    // Verify mortar and grout in buy-list
    const mortar = quote.buyList.find((i) => i.id === "fl-thinset-mortar")
    const grout = quote.buyList.find((i) => i.id === "fl-tile-grout")
    const backer = quote.buyList.find((i) => i.id === "fl-underlayment-cement_backer")
    const leveler = quote.buyList.find((i) => i.id === "fl-self-leveler")

    assert.ok(mortar)
    assert.ok(grout)
    assert.ok(backer)
    assert.ok(leveler)
    assert.equal(mortar.unit, "bags")
    assert.equal(grout.unit, "bags")
    assert.equal(backer.unit, "sheets")
  })
})
