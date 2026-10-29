import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { documentedBedroom } from "../defaults.ts"
import { copyArea, copyLineItem, insertAfter } from "./copy.ts"
import type { LineItemInput } from "../types.ts"

describe("copyArea", () => {
  it("places a measured copy after the original without sharing ids", () => {
    const bedroom = documentedBedroom()
    bedroom.surfaces[0].quantityOverride = 200
    bedroom.surfaces[0].hoursOverride = 4
    const copy = copyArea(bedroom)
    assert.notEqual(copy.id, bedroom.id)
    assert.equal(copy.name, "Bedroom copy")
    assert.equal(copy.lengthFt, 12)
    assert.equal(copy.widthFt, 15)
    assert.equal(copy.heightFt, 8)
    assert.equal(copy.surfaces.length, bedroom.surfaces.length)
    assert.equal(copy.surfaces[0]?.quantityOverride, 200)
    assert.equal(copy.surfaces[0]?.hoursOverride, 4)
    assert.equal(copy.surfaces[0]?.rateId, bedroom.surfaces[0]?.rateId)
    assert.notEqual(copy.surfaces[0]?.id, bedroom.surfaces[0]?.id)
    copy.name = "Guest room"
    copy.surfaces[0].quantityOverride = 10
    assert.equal(bedroom.name, "Bedroom")
    assert.equal(bedroom.surfaces[0]?.quantityOverride, 200)
    assert.deepEqual(
      insertAfter([bedroom, { ...bedroom, id: "hall", name: "Hall" }], bedroom.id, copy).map((area) => area.name),
      ["Bedroom", "Guest room", "Hall"],
    )
  })

  it("names a blank area Copy", () => {
    const copy = copyArea({ ...documentedBedroom(), name: "  " })
    assert.equal(copy.name, "Copy")
  })
})

describe("copyLineItem", () => {
  it("copies the price, notes, and material rows onto a new line", () => {
    const line: LineItemInput = {
      id: "tape",
      label: "Tape",
      clientNote: "Stage in the hallway",
      crewNote: "Leave the roll",
      mode: "quantity",
      hours: 0,
      units: 3,
      pricePerUnit: 8,
      customPrice: 0,
      workOrderHours: 0.5,
      hiddenOnWorkOrder: true,
      materials: [{ id: "roll", name: "Blue tape", quantity: 3, unitPrice: 8 }],
      optional: true,
      selected: false,
      photo: "data:image/jpeg;base64,abc",
    }
    const copy = copyLineItem(line)
    assert.notEqual(copy.id, line.id)
    assert.equal(copy.label, "Tape copy")
    assert.equal(copy.clientNote, "Stage in the hallway")
    assert.equal(copy.mode, "quantity")
    assert.equal(copy.units, 3)
    assert.equal(copy.pricePerUnit, 8)
    assert.equal(copy.workOrderHours, 0.5)
    assert.equal(copy.hiddenOnWorkOrder, true)
    assert.equal(copy.optional, true)
    assert.equal(copy.selected, false)
    assert.equal(copy.photo, "data:image/jpeg;base64,abc")
    assert.equal(copy.materials[0]?.name, "Blue tape")
    assert.notEqual(copy.materials[0]?.id, "roll")
    copy.materials[0].unitPrice = 1
    assert.equal(line.materials[0]?.unitPrice, 8)
    assert.deepEqual(
      insertAfter([line], line.id, copy).map((item) => item.label),
      ["Tape", "Tape copy"],
    )
  })
})
