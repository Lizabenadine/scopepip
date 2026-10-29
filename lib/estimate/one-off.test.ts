import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { DEFAULT_ESTIMATE_SETTINGS, DEFAULT_PRODUCTION_RATES } from "../defaults.ts"
import { PAYMENT_METHODS } from "../defaults.ts"
import type { AreaInput } from "../types.ts"
import { calculateEstimate } from "./calculate.ts"
import { attachOneOffRate, createOneOffRate, detachRateSurface } from "./one-off.ts"
import { withCurrentRates } from "./saved-templates.ts"

function room(): AreaInput {
  return {
    id: "room-1",
    name: "Hall",
    areaType: "room",
    lengthFt: 10,
    widthFt: 10,
    heightFt: 8,
    crewNote: "",
    surfaces: [],
  }
}

describe("one-off rates", () => {
  it("prices this job from a speed that is not in the company book", () => {
    const rate = createOneOffRate({ label: "Beadboard", basis: "sqft_per_hour", speed: 160, kind: "interior" })
    assert.ok(rate)
    if (!rate) return
    assert.equal(rate.oneOff, true)
    assert.equal(DEFAULT_PRODUCTION_RATES.some((item) => item.id === rate.id), false)

    const attached = attachOneOffRate([room()], "room-1", DEFAULT_PRODUCTION_RATES, rate)
    assert.equal(attached.rates.at(-1)?.id, rate.id)
    assert.equal(attached.areas[0]?.surfaces[0]?.rateId, rate.id)

    const quote = calculateEstimate({
      areas: attached.areas,
      lineItems: [],
      rates: attached.rates,
      settings: { ...DEFAULT_ESTIMATE_SETTINGS, hourRounding: 0, minimumJobCharge: 0 },
      paymentMethods: PAYMENT_METHODS,
    })
    const surface = quote.areas[0]?.surfaces[0]
    assert.equal(surface?.clientLabel, "Beadboard")
    assert.equal(surface?.quantity, 320)
    assert.equal(surface?.allocatedHours, 2)
    assert.equal(surface?.price, 150)

    const twoCoats = calculateEstimate({
      areas: [
        {
          ...attached.areas[0]!,
          surfaces: [{ ...attached.areas[0]!.surfaces[0]!, coatCount: 2, finishCoats: 2 }],
        },
      ],
      lineItems: [],
      rates: attached.rates,
      settings: { ...DEFAULT_ESTIMATE_SETTINGS, hourRounding: 0, minimumJobCharge: 0 },
      paymentMethods: PAYMENT_METHODS,
    })
    assert.equal(twoCoats.areas[0]?.surfaces[0]?.allocatedHours, 4)
  })

  it("prices a dollar rate by the measured area and keeps zero hours", () => {
    const rate = createOneOffRate({ label: "Stain", basis: "dollars_per_sqft", speed: 2, kind: "exterior" })
    assert.ok(rate)
    if (!rate) return
    const attached = attachOneOffRate([room()], "room-1", [], rate)
    const quote = calculateEstimate({
      areas: attached.areas,
      lineItems: [],
      rates: attached.rates,
      settings: { ...DEFAULT_ESTIMATE_SETTINGS, hourRounding: 0, minimumJobCharge: 0 },
      paymentMethods: [],
    })
    assert.equal(quote.areas[0]?.surfaces[0]?.allocatedHours, 0)
    assert.equal(quote.areas[0]?.surfaces[0]?.price, 640)
  })

  it("drops the rate when the last surface turns off, and leaves a shared rate in place", () => {
    assert.equal(createOneOffRate({ label: "  ", basis: "sqft_per_hour", speed: 100, kind: "interior" }), null)
    assert.equal(createOneOffRate({ label: "Brick", basis: "sqft_per_hour", speed: 0, kind: "interior" }), null)

    const rate = createOneOffRate({ label: "Brick", basis: "sqft_per_hour", speed: 40, kind: "interior" })
    assert.ok(rate)
    if (!rate) return
    const first = attachOneOffRate([room()], "room-1", [], rate)
    const secondRoom: AreaInput = { ...room(), id: "room-2", name: "Stair" }
    const both = attachOneOffRate(first.areas.concat(secondRoom), "room-2", first.rates, rate)
    const oneLeft = detachRateSurface(both.areas, "room-1", both.rates, rate.id)
    assert.equal(oneLeft.rates.some((item) => item.id === rate.id), true)
    assert.equal(oneLeft.areas[0]?.surfaces.length, 0)
    const none = detachRateSurface(oneLeft.areas, "room-2", oneLeft.rates, rate.id)
    assert.equal(none.rates.some((item) => item.id === rate.id), false)
  })

  it("does not let a company rate replace a one-off speed", () => {
    const rate = createOneOffRate({ label: "Brick", basis: "sqft_per_hour", speed: 40, kind: "interior" })
    assert.ok(rate)
    if (!rate) return
    const walls = DEFAULT_PRODUCTION_RATES.find((item) => item.id === "walls")
    assert.ok(walls)
    const draft = [...DEFAULT_PRODUCTION_RATES, rate]
    const current = DEFAULT_PRODUCTION_RATES.map((item) =>
      item.id === "walls" ? { ...item, clientLabel: "Changed walls" } : item,
    )
    const area = attachOneOffRate(
      [{ ...room(), surfaces: [{ id: "walls", rateId: "walls", coatCount: 2, itemCount: 0, quantityOverride: null, crewNote: "" }] }],
      "room-1",
      draft,
      rate,
    ).areas[0]!
    const refreshed = withCurrentRates(draft, current, [area])
    assert.equal(refreshed.find((item) => item.id === rate.id)?.coatRates[0]?.value, 40)
    assert.equal(refreshed.find((item) => item.id === "walls")?.clientLabel, "Changed walls")
  })
})
