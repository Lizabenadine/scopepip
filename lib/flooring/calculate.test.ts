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

  it("correctly distinguishes profit margin from markup", () => {
    const room: FlooringRoom = {
      ...createBlankFlooringRoom("Office"),
      length: { feet: 10, inches: 0 },
      width: { feet: 10, inches: 0 },
      deductions: [],
      additionsSqFt: 0,
      materialType: "lvp",
      sqFtPerBox: 20,
      wastePercent: 0,
      materialCostPerSqFt: 5, // 5 * 100 = $500
      installCostPerSqFt: 5,  // 5 * 100 = $500
      underlaymentType: "none",
      removeExistingType: "none",
      subfloorPrepType: "none",
      includeBaseboard: false,
      includeQuarterRound: false,
      transitions: [],
    }

    // Subtotal = $1000. Overhead = 0%. Cost basis = $1000.
    // 1) Markup mode at 25%:
    // Profit = $1000 * 25% = $250. Total = $1250.
    // Margin = 250 / 1250 = 20%.
    const markupScope: FlooringScope = {
      rooms: [room],
      defaultWastePercent: 0,
      dumpsterFee: 0,
      overheadPercent: 0,
      profitPercent: 25,
      profitMode: "markup",
    }
    const markupQuote = calculateFlooringQuote(markupScope)
    assert.equal(markupQuote.subtotal, 1000)
    assert.equal(markupQuote.profit, 250)
    assert.equal(markupQuote.total, 1250)
    assert.equal(markupQuote.effectiveMarkupPercent, 25)
    assert.equal(markupQuote.effectiveMarginPercent, 20)

    // 2) Margin mode at 20%:
    // Total = $1000 / (1 - 0.20) = $1250. Profit = $250.
    // Markup = 250 / 1000 = 25%.
    const marginScope: FlooringScope = {
      rooms: [room],
      defaultWastePercent: 0,
      dumpsterFee: 0,
      overheadPercent: 0,
      profitPercent: 20,
      profitMode: "margin",
    }
    const marginQuote = calculateFlooringQuote(marginScope)
    assert.equal(marginQuote.subtotal, 1000)
    assert.equal(marginQuote.profit, 250)
    assert.equal(marginQuote.total, 1250)
    assert.equal(marginQuote.effectiveMarginPercent, 20)
    assert.equal(marginQuote.effectiveMarkupPercent, 25)
  })

  it("calculates Juan's example: Sand, Stain & Clear Coat, 1,300 sq ft @ $8/sq ft = $10,400", () => {
    const scope: FlooringScope = {
      jobType: "refinish",
      refinishService: "sand_stain_clear",
      refinishAreaSource: "manual",
      refinishManualSqFt: 1300,
      refinishSellingRatePerSqFt: 8,
      refinishStairs: [],
      refinishRepairs: [],
      rooms: [createBlankFlooringRoom("Ignored Room")],
      defaultWastePercent: 10,
      dumpsterFee: 150, // Should be excluded from refinishing total
      overheadPercent: 10, // Should be skipped on final selling rate
      profitPercent: 20, // Should be skipped on final selling rate
    }

    const quote = calculateFlooringQuote(scope)
    assert.equal(quote.jobType, "refinish")
    assert.equal(quote.netSqFt, 1300)
    assert.equal(quote.grossSqFt, 1300)
    assert.equal(quote.refinishSellingRate, 8)
    assert.equal(quote.refinishBasePrice, 10400)
    assert.equal(quote.stairsTotal, 0)
    assert.equal(quote.repairsTotal, 0)
    assert.equal(quote.overhead, 0, "Overhead must be skipped because selling rate includes it")
    assert.equal(quote.profit, 0, "Profit must be skipped because selling rate includes it")
    assert.equal(quote.subtotal, 10400)
    assert.equal(quote.total, 10400, "Juan's estimate total must be exactly $10,400")

    // Installation-only charges must be strictly excluded
    assert.equal(quote.materialCost, 0)
    assert.equal(quote.dumpsterFee, 0)
    assert.equal(quote.prepCost, 0)
    assert.equal(quote.demoCost, 0)
    assert.equal(quote.trimCost, 0)
    assert.equal(quote.transitionsCost, 0)
    assert.equal(quote.totalBoxes, 0)
    assert.equal(quote.buyList.length, 0)
  })

  it("calculates refinishing with room measurements when areaSource is 'rooms' and ignores manual sq ft", () => {
    // 2 rooms: 20'x15' (300 sf) and 10'x12' (120 sf) = 420 sf net
    const room1: FlooringRoom = {
      ...createBlankFlooringRoom("Living Room"),
      length: { feet: 20, inches: 0 },
      width: { feet: 15, inches: 0 },
      deductions: [],
      additionsSqFt: 0,
    }
    const room2: FlooringRoom = {
      ...createBlankFlooringRoom("Dining Room"),
      length: { feet: 10, inches: 0 },
      width: { feet: 12, inches: 0 },
      deductions: [],
      additionsSqFt: 0,
    }

    const scope: FlooringScope = {
      jobType: "refinish",
      refinishService: "screen_recoat",
      refinishAreaSource: "rooms",
      refinishManualSqFt: 9999, // Should be ignored because areaSource is 'rooms'
      refinishSellingRatePerSqFt: 3.5,
      rooms: [room1, room2],
      defaultWastePercent: 0,
      dumpsterFee: 0,
      overheadPercent: 15,
      profitPercent: 25,
    }

    const quote = calculateFlooringQuote(scope)
    assert.equal(quote.netSqFt, 420)
    assert.equal(quote.refinishSellingRate, 3.5)
    // 420 * $3.50 = $1,470
    assert.equal(quote.subtotal, 1470)
    assert.equal(quote.total, 1470)
  })

  it("calculates optional stairs and repairs add-ons with tax settings", () => {
    const scope: FlooringScope = {
      jobType: "refinish",
      refinishService: "sand_refinish",
      refinishAreaSource: "manual",
      refinishManualSqFt: 1000,
      refinishSellingRatePerSqFt: 5.5, // 1000 * 5.5 = $5,500 base
      refinishStairs: [
        { id: "s1", name: "Box Steps", quantity: 14, unitPrice: 50, total: 700 },
        { id: "s2", name: "Landing", quantity: 1, unitPrice: 150, total: 150 },
      ],
      refinishRepairs: [
        { id: "r1", name: "Board Replacement", quantity: 5, unitPrice: 60, total: 300 },
      ],
      rooms: [],
      defaultWastePercent: 0,
      dumpsterFee: 0,
      overheadPercent: 0,
      profitPercent: 0,
    }

    // Without tax: $5500 + $850 stairs + $300 repairs = $6,650
    const quoteNoTax = calculateFlooringQuote(scope)
    assert.equal(quoteNoTax.refinishBasePrice, 5500)
    assert.equal(quoteNoTax.stairsTotal, 850)
    assert.equal(quoteNoTax.repairsTotal, 300)
    assert.equal(quoteNoTax.subtotal, 6650)
    assert.equal(quoteNoTax.total, 6650)

    // With 10% tax on total_job: 6650 + 665 = $7,315
    const quoteWithTax = calculateFlooringQuote(scope, { taxPercent: 10, taxBasis: "total_job" })
    assert.equal(quoteWithTax.tax, 665)
    assert.equal(quoteWithTax.total, 7315)
  })

  it("verifies existing installation estimate calculates the exact same total", () => {
    const room: FlooringRoom = {
      ...createBlankFlooringRoom("Bedroom"),
      length: { feet: 12, inches: 0 },
      width: { feet: 12, inches: 0 },
      deductions: [],
      additionsSqFt: 0,
      sqFtPerBox: 20,
      wastePercent: 10,
      materialCostPerSqFt: 4,
      installCostPerSqFt: 2.5,
      underlaymentType: "none",
      removeExistingType: "none",
      subfloorPrepType: "none",
      includeBaseboard: false,
      includeQuarterRound: false,
      transitions: [],
    }

    // 144 sq ft net * 1.1 = 158.4 -> 8 boxes * 20 = 160 sq ft * $4 = $640 material
    // 144 * $2.5 = $360 labor
    // Subtotal = $1000, Overhead 10% = $100 -> Cost basis = $1100
    // Markup 20% = $220 -> Total = $1320
    const existingScope: FlooringScope = {
      jobType: "installation",
      rooms: [room],
      defaultWastePercent: 10,
      dumpsterFee: 0,
      overheadPercent: 10,
      profitPercent: 20,
      profitMode: "markup",
    }

    const quote = calculateFlooringQuote(existingScope)
    assert.equal(quote.jobType, "installation")
    assert.equal(quote.netSqFt, 144)
    assert.equal(quote.materialCost, 640)
    assert.equal(quote.laborCost, 360)
    assert.equal(quote.subtotal, 1000)
    assert.equal(quote.overhead, 100)
    assert.equal(quote.profit, 220)
    assert.equal(quote.total, 1320)
  })
})
