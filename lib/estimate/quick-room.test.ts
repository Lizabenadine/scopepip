import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { quickRoom } from "./quick-room.ts"

describe("quick room", () => {
  it("creates a blank-dimension bedroom when the name matches", () => {
    const room = quickRoom(" bedroom ", "interior")
    assert.ok(room)
    assert.equal(room?.name, "Bedroom")
    assert.equal(room?.lengthFt, 0)
    assert.equal(room?.widthFt, 0)
    assert.equal(room?.heightFt, 0)
    assert.equal(room?.surfaces.some((surface) => surface.rateId === "walls"), true)
    assert.equal(room?.surfaces.every((surface) => surface.itemCount === 0), true)
  })

  it("starts a new interior name with zero dimensions and walls, ceiling, and trim", () => {
    const room = quickRoom("Guest room", "interior")
    assert.ok(room)
    assert.equal(room?.heightFt, 0)
    assert.equal(room?.lengthFt, 0)
    assert.equal(room?.widthFt, 0)
    assert.deepEqual(
      room?.surfaces.map((surface) => surface.rateId),
      ["walls", "ceiling", "baseboards"],
    )
  })

  it("starts an exterior name on siding with zero dimensions", () => {
    const room = quickRoom("North wall", "exterior")
    assert.equal(room?.surfaces[0]?.rateId, "siding")
    assert.equal(room?.heightFt, 0)
    assert.equal(quickRoom("   ", "interior"), null)
  })
})
