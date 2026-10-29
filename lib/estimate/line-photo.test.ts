import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { DEFAULT_ESTIMATE_SETTINGS, PAYMENT_METHODS, blankLineItem } from "../defaults.ts"
import { calculateEstimate } from "./calculate.ts"
import { linePhoto } from "./line-photo.ts"

const jpeg = `data:image/jpeg;base64,${"a".repeat(40)}`

describe("line photos", () => {
  it("keeps a jpeg beside the priced line and leaves the price alone", () => {
    const quote = calculateEstimate({
      areas: [],
      lineItems: [
        {
          ...blankLineItem("closet", "custom"),
          label: "Closet shelves",
          customPrice: 125,
          photo: jpeg,
        },
      ],
      rates: [],
      settings: { ...DEFAULT_ESTIMATE_SETTINGS, hourRounding: 0, minimumJobCharge: 0 },
      paymentMethods: PAYMENT_METHODS,
    })
    assert.equal(quote.lineItems[0]?.photo, jpeg)
    assert.equal(quote.lineItems[0]?.price, 125)
    assert.equal(quote.total, 125)
  })

  it("drops a script, an oversized file, and a missing photo", () => {
    assert.equal(linePhoto("javascript:alert(1)"), undefined)
    assert.equal(linePhoto(`data:image/svg+xml,${"a".repeat(20)}`), undefined)
    assert.equal(linePhoto(`data:image/jpeg;base64,${"a".repeat(700_000)}`), undefined)
    assert.equal(linePhoto(undefined), undefined)

    const quote = calculateEstimate({
      areas: [],
      lineItems: [{ ...blankLineItem("plain", "custom"), customPrice: 10, photo: "javascript:alert(1)" }],
      rates: [],
      settings: { ...DEFAULT_ESTIMATE_SETTINGS, hourRounding: 0, minimumJobCharge: 0 },
      paymentMethods: PAYMENT_METHODS,
    })
    assert.equal(quote.lineItems[0]?.photo, undefined)
    assert.equal(quote.lineItems[0]?.price, 10)
  })
})
