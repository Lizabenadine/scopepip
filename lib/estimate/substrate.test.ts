import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  DEFAULT_ESTIMATE_SETTINGS,
  DEFAULT_PRODUCTION_RATES,
  PAYMENT_METHODS,
  documentedBedroom,
} from "../defaults.ts"
import type { ProductionRate } from "../types.ts"
import { calculateEstimate } from "./calculate.ts"
import {
  applySubstrate,
  ensureSubstrateRates,
  substrateChoices,
  surfaceHeads,
} from "./substrate.ts"

function wallsOnly() {
  const bedroom = documentedBedroom()
  return {
    ...bedroom,
    surfaces: bedroom.surfaces.filter((surface) => surface.rateId === "walls"),
  }
}

function quoteWalls(rates: ProductionRate[] = DEFAULT_PRODUCTION_RATES) {
  return calculateEstimate({
    areas: [wallsOnly()],
    lineItems: [],
    rates,
    settings: { ...DEFAULT_ESTIMATE_SETTINGS, hourRounding: 0, minimumJobCharge: 0 },
    paymentMethods: PAYMENT_METHODS,
  }).areas[0]?.surfaces[0]
}

describe("substrates", () => {
  it("prices drywall walls at the existing two-coat speed", () => {
    const surface = quoteWalls()
    assert.equal(surface?.clientLabel, "Walls")
    assert.equal(surface?.internalLabel, "Walls")
    assert.equal(surface?.allocatedHours, 5.082)
    assert.equal(surface?.price, 381.15)
  })

  it("switches the surface onto the wood, masonry, or metal rate", () => {
    const walls = wallsOnly().surfaces[0]
    assert.ok(walls)
    const wood = applySubstrate(walls, DEFAULT_PRODUCTION_RATES, "wood")
    assert.equal(wood.rateId, "walls-wood")
    assert.equal(wood.coatCount, walls.coatCount)
    assert.equal(wood.substrate, "wood")

    const woodQuote = calculateEstimate({
      areas: [{ ...wallsOnly(), surfaces: [wood] }],
      lineItems: [],
      rates: DEFAULT_PRODUCTION_RATES,
      settings: { ...DEFAULT_ESTIMATE_SETTINGS, hourRounding: 0, minimumJobCharge: 0 },
      paymentMethods: PAYMENT_METHODS,
    }).areas[0]?.surfaces[0]
    assert.equal(woodQuote?.allocatedHours, 7.2)
    assert.equal(woodQuote?.price, 540)
    assert.equal(woodQuote?.clientLabel, "Walls")
    assert.equal(woodQuote?.internalLabel, "Walls · Wood")
    assert.equal(woodQuote?.clientDescription, "Wood walls painted the full number of coats.")

    const masonry = applySubstrate(wood, DEFAULT_PRODUCTION_RATES, "masonry")
    assert.equal(masonry.rateId, "walls-masonry")
    const masonryQuote = calculateEstimate({
      areas: [{ ...wallsOnly(), surfaces: [masonry] }],
      lineItems: [],
      rates: DEFAULT_PRODUCTION_RATES,
      settings: { ...DEFAULT_ESTIMATE_SETTINGS, hourRounding: 0, minimumJobCharge: 0 },
      paymentMethods: PAYMENT_METHODS,
    }).areas[0]?.surfaces[0]
    assert.equal(masonryQuote?.allocatedHours, 9.6)
    assert.equal(masonryQuote?.price, 720)

    const metal = applySubstrate(masonry, DEFAULT_PRODUCTION_RATES, "metal")
    assert.equal(metal.rateId, "walls-metal")
    const back = applySubstrate(metal, DEFAULT_PRODUCTION_RATES, "drywall")
    assert.equal(back.rateId, "walls")
  })

  it("keeps one walls toggle and adds missing substrate rates without replacing a custom speed", () => {
    const heads = surfaceHeads(DEFAULT_PRODUCTION_RATES)
    assert.equal(heads.filter((rate) => rate.measure === "walls").length, 1)
    assert.equal(heads.find((rate) => rate.measure === "walls")?.id, "walls")
    const walls = heads.find((rate) => rate.id === "walls")
    assert.ok(walls)
    assert.deepEqual(substrateChoices(DEFAULT_PRODUCTION_RATES, walls), [
      "drywall",
      "wood",
      "masonry",
      "metal",
    ])

    const custom: ProductionRate = {
      ...DEFAULT_PRODUCTION_RATES.find((rate) => rate.id === "walls-wood")!,
      coatRates: [{ coats: 2, value: 50 }],
    }
    const book = DEFAULT_PRODUCTION_RATES.filter((rate) => rate.id !== "walls-wood" && rate.id !== "walls-metal")
    const next = ensureSubstrateRates(book, [custom])
    assert.equal(next.find((rate) => rate.id === "walls-wood")?.coatRates[0]?.value, 50)
    assert.equal(next.some((rate) => rate.id === "walls-metal"), true)
    assert.equal(ensureSubstrateRates(next, [custom]), next)
  })
})
