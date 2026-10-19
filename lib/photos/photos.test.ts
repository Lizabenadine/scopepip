import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { createSeedState } from "../data/seed.ts"
import { autoLink, describeLink } from "./link.ts"
import { receivePhoto } from "./receive.ts"

const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
)

describe("autoLink", () => {
  it("ties a prep concern to the prep note and a touch-up to the line item", () => {
    const state = createSeedState()
    const estimate = state.estimates.find((item) => item.id === "est-ortiz")
    assert.ok(estimate)
    const scope = {
      areas: estimate.areas.map((area) => ({
        id: area.id,
        name: area.name,
        crewNote: area.crewNote,
        prepLevel: area.prepLevel,
      })),
      lineItems: estimate.lineItems.map((item) => ({
        id: item.id,
        label: item.label,
        crewNote: item.crewNote,
        selected: item.selected,
      })),
      prepNotes: estimate.crewNote,
    }
    const prep = autoLink("prep_concern", scope)
    assert.equal(prep.kind, "prep")
    assert.match(prep.detail, /Lockbox code is on the estimator note/)
    const lena = state.estimates.find((item) => item.id === "est-lena")
    assert.ok(lena)
    const lenaPrep = autoLink("prep_concern", {
      areas: lena.areas.map((area) => ({
        id: area.id,
        name: area.name,
        crewNote: area.crewNote,
        prepLevel: area.prepLevel,
      })),
      lineItems: [],
      prepNotes: lena.crewNote,
    })
    assert.equal(lenaPrep.label, "Prep · Living room")
    const touch = autoLink("touch_up", scope)
    assert.equal(touch.kind, "line")
    assert.equal(touch.id, "ortiz-trim")
    assert.match(touch.detail, /Semi-gloss enamel/)
    const shown = describeLink({ kind: "line", id: "ortiz-trim" }, scope)
    assert.equal(shown.label, "Trim package")
  })
})

describe("receivePhoto", () => {
  it("stores a tagged photo on the work order", () => {
    const result = receivePhoto(
      "est-lena",
      {
        tag: "before",
        caption: "North wall",
        linkKind: "area",
        linkId: "lena-bed",
        fileName: "wall.png",
        contentType: "image/png",
        bytes: new Uint8Array(PNG),
      },
      new Date("2026-10-02T18:00:00.000Z"),
    )
    assert.equal(result.ok, true)
    if (!result.ok) return
    assert.equal(result.photo.estimateId, "est-lena")
    assert.equal(result.photo.tag, "before")
    assert.equal(result.photo.linkId, "lena-bed")
    assert.equal(result.photo.caption, "North wall")
    assert.match(result.photo.url, /^data:image\/png;base64,/)
    assert.match(result.photo.storagePath, /^local\/est-lena\//)
  })

  it("rejects a file that is not a photo and an unknown tag", () => {
    const text = receivePhoto("est-lena", {
      tag: "before",
      caption: "",
      linkKind: null,
      linkId: null,
      fileName: "notes.txt",
      contentType: "text/plain",
      bytes: new Uint8Array([1, 2, 3]),
    })
    assert.equal(text.ok, false)
    const tag = receivePhoto("est-lena", {
      tag: "done",
      caption: "",
      linkKind: null,
      linkId: null,
      fileName: "wall.png",
      contentType: "image/png",
      bytes: new Uint8Array(PNG),
    })
    assert.equal(tag.ok, false)
  })
})
