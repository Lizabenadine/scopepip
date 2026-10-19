import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { DEFAULT_PRODUCTION_RATES, documentedBedroom } from "../defaults.ts"
import { DEFAULT_ESTIMATE_SETTINGS } from "../defaults.ts"
import { calculateEstimate } from "./calculate.ts"
import { applySavedTemplate, captureEstimateTemplate, withCurrentRates } from "./saved-templates.ts"

describe("saved estimate templates", () => {
  it("keeps the room and the rate id, then prices with the current speed", () => {
    const bedroom = documentedBedroom()
    const saved = captureEstimateTemplate({
      name: "My bedroom",
      kind: "interior",
      title: "Bedroom repaint",
      areas: [bedroom],
      lineItems: [],
      now: "2026-10-19T00:00:00.000Z",
    })
    assert.ok(saved)
    if (!saved) return
    assert.equal(saved.areas[0]?.surfaces[0]?.rateId, "walls")
    assert.equal("value" in (saved.areas[0]?.surfaces[0] ?? {}), false)

    const applied = applySavedTemplate(saved)
    assert.equal(applied.areas[0]?.name, "Bedroom")
    assert.equal(applied.areas[0]?.lengthFt, 12)
    assert.notEqual(applied.areas[0]?.id, bedroom.id)
    applied.areas[0]!.name = "Changed"
    assert.equal(saved.areas[0]?.name, "Bedroom")

    const slow = calculateEstimate({
      areas: applied.areas,
      lineItems: [],
      rates: DEFAULT_PRODUCTION_RATES,
      settings: DEFAULT_ESTIMATE_SETTINGS,
      paymentMethods: [],
    })
    const fasterRates = DEFAULT_PRODUCTION_RATES.map((rate) =>
      rate.id === "walls"
        ? { ...rate, coatRates: rate.coatRates.map((entry) => (entry.coats === 2 ? { ...entry, value: 100 } : entry)) }
        : rate,
    )
    const refreshed = withCurrentRates(DEFAULT_PRODUCTION_RATES, fasterRates, applied.areas)
    const fast = calculateEstimate({
      areas: applied.areas,
      lineItems: [],
      rates: refreshed,
      settings: DEFAULT_ESTIMATE_SETTINGS,
      paymentMethods: [],
    })
    const hours = (quote: typeof slow) => quote.areas[0]?.surfaces.find((surface) => surface.internalLabel === "Walls")?.allocatedHours
    assert.equal(hours(slow), 5.5)
    assert.equal(hours(fast), 4.5)
  })

  it("refuses a blank name or an empty estimate", () => {
    assert.equal(
      captureEstimateTemplate({ name: "  ", kind: "interior", title: "", areas: [documentedBedroom()], lineItems: [] }),
      null,
    )
    assert.equal(
      captureEstimateTemplate({ name: "Empty", kind: "exterior", title: "", areas: [], lineItems: [] }),
      null,
    )
  })
})
