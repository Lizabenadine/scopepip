import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { DEFAULT_ESTIMATE_SETTINGS } from "../defaults.ts"
import { createSeedState } from "../data/seed.ts"
import { DEFAULT_COMPANY_NAME, displayCompanyName } from "./company.ts"

describe("displayCompanyName", () => {
  it("falls back to ScopePipe when the org profile is unset", () => {
    assert.equal(displayCompanyName(undefined), DEFAULT_COMPANY_NAME)
    assert.equal(displayCompanyName(null), "ScopePipe")
    assert.equal(displayCompanyName(""), "ScopePipe")
    assert.equal(displayCompanyName("   "), "ScopePipe")
    assert.equal(displayCompanyName(DEFAULT_ESTIMATE_SETTINGS.companyName), "ScopePipe")
    assert.equal(displayCompanyName(createSeedState().estimateSettings.companyName), "ScopePipe")
  })

  it("uses the company name saved on the profile", () => {
    assert.equal(displayCompanyName("  Northwall Paint  "), "Northwall Paint")
  })
})
