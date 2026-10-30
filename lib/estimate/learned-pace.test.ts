import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  DEFAULT_ESTIMATE_SETTINGS,
  DEFAULT_PRODUCTION_RATES,
  PAYMENT_METHODS,
  TWO_COAT_DOOR_HOURS,
  TWO_COAT_WALL_SQFT_PER_HOUR,
  documentedBedroom,
} from "../defaults.ts"
import { calculateEstimate } from "./calculate.ts"
import { applyLearnedPaces, learnRoomPace } from "./learned-pace.ts"
import type { AreaInput } from "../types.ts"

function quoteArea(area: AreaInput) {
  return calculateEstimate({
    areas: [area],
    lineItems: [],
    rates: DEFAULT_PRODUCTION_RATES,
    settings: DEFAULT_ESTIMATE_SETTINGS,
    paymentMethods: PAYMENT_METHODS,
  })
}

describe("hours from finished jobs", () => {
  it("teaches the next room of that size and leaves the finished job on its price", () => {
    const bedroom = documentedBedroom()
    const original = quoteArea(bedroom)
    const priced = original.areas[0]
    assert.ok(priced)
    const learned = learnRoomPace({
      estimateId: "est-finished",
      area: bedroom,
      rates: DEFAULT_PRODUCTION_RATES,
      estimatedHours: priced.allocatedHours,
      surfaceHours: priced.surfaces.map((surface) => ({
        id: surface.id,
        allocatedHours: surface.allocatedHours,
      })),
      actualHours: priced.allocatedHours * 2,
    })
    assert.equal(learned.ok, true)
    if (!learned.ok) return

    const walls = learned.pace.speeds.find((speed) => speed.rateId === "walls")
    const door = learned.pace.speeds.find((speed) => speed.rateId === "door-frame")
    assert.equal(walls?.value, TWO_COAT_WALL_SQFT_PER_HOUR / 2)
    assert.equal(door?.value, TWO_COAT_DOOR_HOURS * 2)
    assert.equal(JSON.stringify(learned.pace).includes("price"), false)
    assert.equal(JSON.stringify(learned.pace).includes("$"), false)
    assert.equal(
      DEFAULT_PRODUCTION_RATES.find((rate) => rate.id === "walls")?.coatRates.find((entry) => entry.coats === 2)?.value,
      TWO_COAT_WALL_SQFT_PER_HOUR,
    )

    const finished = applyLearnedPaces([bedroom], [learned.pace], "est-finished", new Set([bedroom.id]))
    assert.equal(finished[0], bedroom)
    assert.equal(finished[0]?.surfaces.some((surface) => surface.paceSpeed != null), false)
    assert.equal(quoteArea(finished[0] ?? bedroom).total, original.total)

    const nextRoom: AreaInput = {
      ...bedroom,
      id: "next-bedroom",
      surfaces: bedroom.surfaces.map((surface) => ({ ...surface, id: `${surface.id}-next` })),
    }
    const paced = applyLearnedPaces([nextRoom], [learned.pace], "est-next")
    assert.equal(paced[0]?.surfaces.find((surface) => surface.rateId === "walls")?.paceSpeed, walls?.value)
    const next = quoteArea(paced[0] ?? nextRoom)
    const nextWalls = next.areas[0]?.surfaces.find((surface) => surface.id === "walls-next")
    const originalWalls = priced.surfaces.find((surface) => surface.id === "walls")
    assert.ok(nextWalls && originalWalls)
    assert.ok(nextWalls.allocatedHours > originalWalls.allocatedHours)
    assert.ok(next.allocatedHours > original.allocatedHours)

    const otherSize: AreaInput = { ...nextRoom, id: "other-size", lengthFt: 10 }
    const untouched = applyLearnedPaces([otherSize], [learned.pace], "est-other")
    assert.equal(untouched[0]?.surfaces.some((surface) => surface.paceSpeed != null), false)

    const alreadyPriced = applyLearnedPaces([bedroom], [learned.pace], "est-older", new Set([bedroom.id]))
    assert.equal(alreadyPriced[0], bedroom)
  })

  it("keeps a saved speed when a later room of that size is learned", () => {
    const bedroom = documentedBedroom()
    const priced = quoteArea(bedroom).areas[0]
    assert.ok(priced)
    const first = learnRoomPace({
      estimateId: "est-a",
      area: bedroom,
      rates: DEFAULT_PRODUCTION_RATES,
      estimatedHours: priced.allocatedHours,
      surfaceHours: priced.surfaces.map((surface) => ({ id: surface.id, allocatedHours: surface.allocatedHours })),
      actualHours: priced.allocatedHours * 2,
    })
    const second = learnRoomPace({
      estimateId: "est-b",
      area: { ...bedroom, id: "later" },
      rates: DEFAULT_PRODUCTION_RATES,
      estimatedHours: priced.allocatedHours,
      surfaceHours: priced.surfaces.map((surface) => ({ id: surface.id, allocatedHours: surface.allocatedHours })),
      actualHours: priced.allocatedHours,
    })
    assert.equal(first.ok, true)
    assert.equal(second.ok, true)
    if (!first.ok || !second.ok) return

    const saved: AreaInput = {
      ...bedroom,
      id: "saved-room",
      surfaces: bedroom.surfaces.map((surface) =>
        surface.rateId === "walls" ? { ...surface, paceSpeed: 42.5, paceCoats: 2 } : surface,
      ),
    }
    const kept = applyLearnedPaces([saved], [first.pace, second.pace], "est-saved", new Set([saved.id]))
    assert.equal(kept[0]?.surfaces.find((surface) => surface.rateId === "walls")?.paceSpeed, 42.5)

    const fresh: AreaInput = {
      ...bedroom,
      id: "fresh-room",
      surfaces: bedroom.surfaces.map((surface) => ({ ...surface })),
    }
    const newest = applyLearnedPaces([fresh], [first.pace, second.pace], "est-fresh")
    assert.equal(
      newest[0]?.surfaces.find((surface) => surface.rateId === "walls")?.paceSpeed,
      TWO_COAT_WALL_SQFT_PER_HOUR,
    )
  })

  it("does not learn from a blank hour entry", () => {
    const bedroom = documentedBedroom()
    const missed = learnRoomPace({
      estimateId: "est-finished",
      area: bedroom,
      rates: DEFAULT_PRODUCTION_RATES,
      estimatedHours: 13.5,
      surfaceHours: [],
      actualHours: 0,
    })
    assert.equal(missed.ok, false)
  })
})
