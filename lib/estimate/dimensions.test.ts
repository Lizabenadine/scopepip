import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  areaSqFt,
  formatFeetInches,
  fromDecimalFeet,
  parseFeetInches,
  perimeterLinearFt,
  toDecimalFeet,
} from "./dimensions.ts"

describe("Dimensions & Feet-Inches Takeoff", () => {
  it("converts feet and inches to decimal feet with high precision", () => {
    assert.equal(toDecimalFeet({ feet: 12, inches: 6 }), 12.5)
    assert.equal(toDecimalFeet({ feet: 10, inches: 0 }), 10)
    assert.equal(toDecimalFeet({ feet: 8, inches: 3 }), 8.25)
  })

  it("converts decimal feet to feet and inches", () => {
    assert.deepEqual(fromDecimalFeet(12.5), { feet: 12, inches: 6 })
    assert.deepEqual(fromDecimalFeet(10), { feet: 10, inches: 0 })
    assert.deepEqual(fromDecimalFeet(8.25), { feet: 8, inches: 3 })
  })

  it("formats feet and inches cleanly for contractor view", () => {
    assert.equal(formatFeetInches({ feet: 14, inches: 6 }), `14' 6"`)
    assert.equal(formatFeetInches({ feet: 9, inches: 0 }), `9' 0"`)
  })

  it("parses diverse contractor input formats", () => {
    assert.deepEqual(parseFeetInches(`12' 6"`), { feet: 12, inches: 6 })
    assert.deepEqual(parseFeetInches(`12-6`), { feet: 12, inches: 6 })
    assert.deepEqual(parseFeetInches(`12ft 6in`), { feet: 12, inches: 6 })
    assert.deepEqual(parseFeetInches(`12.5`), { feet: 12, inches: 6 })
    assert.deepEqual(parseFeetInches(`15'`), { feet: 15, inches: 0 })
  })

  it("calculates accurate square footage and perimeter", () => {
    // 12'6" by 10'0" = 12.5 * 10 = 125 sq ft
    const sqFt = areaSqFt({ feet: 12, inches: 6 }, { feet: 10, inches: 0 })
    assert.equal(sqFt, 125)

    // Perimeter = 2 * (12.5 + 10) = 45 linear feet
    const perim = perimeterLinearFt({ feet: 12, inches: 6 }, { feet: 10, inches: 0 })
    assert.equal(perim, 45)
  })
})
