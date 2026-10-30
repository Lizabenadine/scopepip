import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { DEFAULT_ESTIMATE_SETTINGS, DEFAULT_PRODUCTION_RATES, PAYMENT_METHODS, documentedBedroom } from "../defaults.ts"
import { calculateEstimate } from "./calculate.ts"
import { storeList } from "./store-list.ts"
import type { Estimate } from "../types.ts"

function estimateFor(areas: Estimate["areas"]): Estimate {
  return {
    id: "est-store",
    clientId: "client",
    stageId: "stage",
    title: "Interior",
    jobAddress: "22 Cedar Court",
    areas,
    lineItems: [],
    rates: DEFAULT_PRODUCTION_RATES,
    settings: DEFAULT_ESTIMATE_SETTINGS,
    scheduledOn: null,
    notes: "",
    crewNote: "",
    acceptedAt: null,
    publicToken: "token",
    clientStatus: "sent",
    signature: null,
    createdAt: "2026-10-01T15:00:00.000Z",
    updatedAt: "2026-10-01T15:00:00.000Z",
  }
}

describe("store list", () => {
  it("groups gallons by product and room and leaves the price off", () => {
    const bedroom = documentedBedroom()
    const living = {
      ...bedroom,
      id: "living",
      name: "Living room",
      surfaces: bedroom.surfaces.map((surface) => ({ ...surface, id: `${surface.id}-living` })),
    }
    const list = storeList(estimateFor([bedroom, living]), "Lena Brooks")
    const wall = list.products.find((product) => product.productName === "Wall paint")
    const quote = calculateEstimate({
      areas: [bedroom],
      lineItems: [],
      rates: DEFAULT_PRODUCTION_RATES,
      settings: DEFAULT_ESTIMATE_SETTINGS,
      paymentMethods: PAYMENT_METHODS,
    })

    assert.ok(wall)
    assert.deepEqual(
      wall.rooms.map((room) => room.areaName),
      ["Bedroom", "Living room"],
    )
    assert.equal(wall.rooms.every((room) => room.surfaceLabel === "Walls"), true)
    assert.equal(wall.buyGallons, Math.ceil(wall.paintGallons - 1e-9))
    assert.equal(list.products.some((product) => product.productName === "Prep"), false)
    assert.equal(list.products.some((product) => product.rooms.some((room) => room.surfaceLabel === "Door & frame, 1 side")), false)
    assert.equal(
      storeList(estimateFor([bedroom]), "Lena Brooks").paintGallons,
      quote.paintGallons,
    )
    assert.equal(JSON.stringify(list).includes("price"), false)
    assert.equal(JSON.stringify(list).includes("$"), false)
  })
})
