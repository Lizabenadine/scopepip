import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { reviewLink } from "./review.ts"
import { renderFollowUp } from "./schedule.ts"

describe("review links", () => {
  it("keeps an https review page and drops anything else", () => {
    assert.equal(reviewLink("https://reviews.example/acme"), "https://reviews.example/acme")
    assert.equal(reviewLink("  https://reviews.example/acme  "), "https://reviews.example/acme")
    assert.equal(reviewLink("http://reviews.example/acme"), "")
    assert.equal(reviewLink("javascript:alert(1)"), "")
    assert.equal(reviewLink(""), "")
  })

  it("fills the review page into the finished-job note", () => {
    assert.equal(
      renderFollowUp("A short review helps. {review}", { review: "https://reviews.example/acme" }),
      "A short review helps. https://reviews.example/acme",
    )
    assert.equal(renderFollowUp("A short review helps. {review}", { review: "" }).includes("http"), false)
  })
})
