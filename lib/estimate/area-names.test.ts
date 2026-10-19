import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  DEFAULT_AREA_NAMES,
  addAreaName,
  areaFromName,
  moveAreaName,
  removeAreaName,
  renameAreaName,
} from "./area-names.ts"

describe("area names", () => {
  it("reorders a name without changing the others", () => {
    const moved = moveAreaName(DEFAULT_AREA_NAMES, "name-bathroom", -1)
    assert.equal(moved[1]?.name, "Bathroom")
    assert.equal(moved[2]?.name, "Primary bedroom")
    assert.equal(moveAreaName(DEFAULT_AREA_NAMES, "name-bedroom", -1)[0]?.name, "Bedroom")
    assert.equal(moved.length, DEFAULT_AREA_NAMES.length)
  })

  it("adds a new label and refuses a blank or a duplicate", () => {
    const added = addAreaName(DEFAULT_AREA_NAMES, " Sunroom ")
    assert.equal(added?.at(-1)?.name, "Sunroom")
    assert.equal(addAreaName(DEFAULT_AREA_NAMES, "  "), null)
    assert.equal(addAreaName(DEFAULT_AREA_NAMES, "bedroom"), null)
  })

  it("renames and removes one name", () => {
    const renamed = renameAreaName(DEFAULT_AREA_NAMES, "name-porch", "Front porch")
    assert.equal(renamed.find((item) => item.id === "name-porch")?.name, "Front porch")
    const removed = removeAreaName(DEFAULT_AREA_NAMES, "name-deck")
    assert.equal(removed.some((item) => item.id === "name-deck"), false)
    assert.equal(removed.length, DEFAULT_AREA_NAMES.length - 1)
  })

  it("starts a blank room from a name and leaves the surfaces empty", () => {
    const area = areaFromName("East wall")
    assert.equal(area.name, "East wall")
    assert.equal(area.areaType, "room")
    assert.equal(area.heightFt, 8)
    assert.deepEqual(area.surfaces, [])
    assert.equal(area.lengthFt, 0)
  })
})
