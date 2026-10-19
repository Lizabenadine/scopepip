import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { DEFAULT_ESTIMATE_SETTINGS, DEFAULT_PRODUCTION_RATES } from "../defaults.ts"
import { hourlyRateForKind, rateKinds, ratesForKind, selectEstimateKind, setKindHourlyRate } from "./kinds.ts"

describe("estimate kinds", () => {
  it("splits production rates into interior, exterior, and cabinets", () => {
    const byId = Object.fromEntries(DEFAULT_PRODUCTION_RATES.map((rate) => [rate.id, rateKinds(rate)]))
    assert.deepEqual(byId.walls, ["interior"])
    assert.deepEqual(byId.siding, ["exterior"])
    assert.deepEqual(byId["cabinet-doors"], ["cabinets"])
    assert.deepEqual(byId["door-frame"], ["interior", "exterior"])
    assert.equal(ratesForKind(DEFAULT_PRODUCTION_RATES, "cabinets").every((rate) => rate.id === "cabinet-doors"), true)
    assert.equal(ratesForKind(DEFAULT_PRODUCTION_RATES, "exterior").some((rate) => rate.id === "siding"), true)
    assert.equal(ratesForKind(DEFAULT_PRODUCTION_RATES, "exterior").some((rate) => rate.id === "walls"), false)
  })

  it("prices a type from its own hourly rate and falls back to the general rate", () => {
    const settings = {
      ...DEFAULT_ESTIMATE_SETTINGS,
      hourlyRate: 75,
      typeHourlyRates: { exterior: 90 },
    }
    assert.equal(hourlyRateForKind(settings, "interior"), 75)
    assert.equal(hourlyRateForKind(settings, "exterior"), 90)
    assert.equal(hourlyRateForKind(settings, "cabinets"), 75)
    const exterior = selectEstimateKind(settings, "exterior")
    assert.equal(exterior.hourlyRate, 90)
    assert.equal(exterior.generalHourlyRate, 75)
    const edited = setKindHourlyRate(exterior, "exterior", 95)
    assert.equal(edited.hourlyRate, 95)
    assert.equal(edited.typeHourlyRates?.exterior, 95)
    assert.equal(selectEstimateKind(edited, "interior").hourlyRate, 75)
  })
})
