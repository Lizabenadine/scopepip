import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { cleanTypedNumber, readTypedNumber } from "./typed-number.ts"

describe("typed number", () => {
  it("keeps 10 when the field includes a percent sign", () => {
    const cleaned = cleanTypedNumber("10%")
    assert.equal(cleaned, "10")
    assert.equal(readTypedNumber(cleaned), 10)
  })

  it("keeps the digits while the field is cleared and retyped", () => {
    assert.equal(cleanTypedNumber(""), "")
    assert.equal(readTypedNumber(""), 0)
    assert.equal(cleanTypedNumber("1"), "1")
    assert.equal(cleanTypedNumber("10"), "10")
    assert.equal(readTypedNumber("10"), 10)
  })
})
