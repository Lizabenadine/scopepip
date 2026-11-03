import assert from "node:assert/strict"
import { describe, it } from "node:test"
import type { AreaInput, SurfaceInput } from "../types.ts"
import { roomsMissingColor } from "./finish.ts"

function surface(): SurfaceInput {
  return {
    id: "walls",
    rateId: "wall",
    coatCount: 2,
    itemCount: 0,
    quantityOverride: null,
    crewNote: "",
  }
}

function room(partial: Partial<AreaInput> & Pick<AreaInput, "name">): AreaInput {
  return {
    id: partial.name,
    name: partial.name,
    areaType: "room",
    lengthFt: 12,
    widthFt: 10,
    heightFt: 8,
    crewNote: "",
    surfaces: partial.surfaces ?? [surface()],
    colorName: partial.colorName,
    sheen: partial.sheen,
  }
}

describe("roomsMissingColor", () => {
  it("asks for a color and a sheen on rooms that have surfaces", () => {
    const names = roomsMissingColor([
      room({ name: "Bedroom", colorName: "Agreeable Gray" }),
      room({ name: "Hall", colorName: "Agreeable Gray", sheen: "Eggshell" }),
      room({ name: "Closet", surfaces: [] }),
    ])
    assert.deepEqual(names, ["Bedroom"])
  })
})
