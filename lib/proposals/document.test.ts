import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { DEFAULT_ESTIMATE_SETTINGS } from "../defaults.ts"
import {
  DEFAULT_ACCEPT_WORDING,
  DEFAULT_CONTRACT_TERMS,
  DEFAULT_DECLINE_WORDING,
  proposalDocument,
  proposalPageList,
} from "./document.ts"

describe("proposalDocument", () => {
  it("uses the built-in cover, contract, and signature wording when nothing is saved", () => {
    const document = proposalDocument(DEFAULT_ESTIMATE_SETTINGS)
    assert.equal(document.coverLine, "")
    assert.deepEqual(document.photos, [])
    assert.deepEqual(document.testimonials, [])
    assert.deepEqual(document.contractTerms, DEFAULT_CONTRACT_TERMS)
    assert.equal(document.acceptWording, DEFAULT_ACCEPT_WORDING)
    assert.equal(document.declineWording, DEFAULT_DECLINE_WORDING)
    assert.deepEqual(
      proposalPageList(document).map((page) => page.label),
      ["Cover", "Scope", "Terms", "Signature"],
    )
  })

  it("keeps a saved cover, photo page, testimonial, contract, and signature wording", () => {
    const document = proposalDocument({
      ...DEFAULT_ESTIMATE_SETTINGS,
      proposalPages: {
        coverLine: " Interior painting, scheduled around your week. ",
        photos: [
          { id: "front", caption: " Front porch ", src: "https://example.com/front.jpg" },
          { id: "bad", caption: "Skip", src: "javascript:alert(1)" },
        ],
        testimonials: [
          { id: "lena", quote: " They left the house clean. ", name: " Lena Ortiz ", detail: " Portland " },
          { id: "blank", quote: " ", name: " ", detail: "" },
        ],
        contractTerms: "Work starts after the deposit.\n\nColor changes after the start are a change order.",
        acceptWording: " I accept this price. ",
        declineWording: " I do not accept this price. ",
      },
    })
    assert.equal(document.coverLine, "Interior painting, scheduled around your week.")
    assert.deepEqual(document.photos, [{ id: "front", caption: "Front porch", src: "https://example.com/front.jpg" }])
    assert.deepEqual(document.testimonials, [
      { id: "lena", quote: "They left the house clean.", name: "Lena Ortiz", detail: "Portland" },
    ])
    assert.deepEqual(document.contractTerms, [
      "Work starts after the deposit.",
      "Color changes after the start are a change order.",
    ])
    assert.equal(document.acceptWording, "I accept this price.")
    assert.equal(document.declineWording, "I do not accept this price.")
    assert.deepEqual(
      proposalPageList(document).map((page) => page.label),
      ["Cover", "Scope", "Photos", "Testimonials", "Terms", "Signature"],
    )
  })
})
