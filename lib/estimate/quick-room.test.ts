import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { quickRoom } from "./quick-room.ts"

describe("quick room", () => {
  it("uses the bedroom template when the name matches", () => {
    const room = quickRoom(" bedroom ", "interior")
    assert.ok(room)
    assert.equal(room?.name, "Bedroom")
    assert.equal(room?.lengthFt, 12)
    assert.equal(room?.widthFt, 15)
    assert.equal(room?.heightFt, 8)
    assert.equal(room?.surfaces.some((surface) => surface.rateId === "walls"), true)
  })

  it("starts a new interior name with walls, ceiling, trim, and a door", () => {
    const room = quickRoom("Guest room", "interior")
    assert.ok(room)
    assert.equal(room?.heightFt, 8)
    assert.equal(room?.lengthFt, 0)
    assert.deepEqual(
      room?.surfaces.map((surface) => surface.rateId),
      ["walls", "ceiling", "baseboards", "door-frame"],
    )
  })

  it("starts an exterior name on siding", () => {
    const room = quickRoom("North wall", "exterior")
    assert.equal(room?.surfaces[0]?.rateId, "siding")
    assert.equal(quickRoom("   ", "interior"), null)
  })
})
