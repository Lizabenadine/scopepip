import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { mailingAddress } from "./format.ts"

describe("mailing address", () => {
  it("keeps the street, city, state, and postal code from a map match", () => {
    assert.equal(
      mailingAddress({
        house_number: "91",
        road: "Coral Road",
        city: "Portland",
        state: "Oregon",
        postcode: "97214",
      }),
      "91 Coral Road, Portland, Oregon 97214",
    )
  })

  it("uses the map label when the pieces are missing", () => {
    assert.equal(mailingAddress({}, "91 Coral Rd, Portland, Oregon"), "91 Coral Rd, Portland, Oregon")
  })
})
