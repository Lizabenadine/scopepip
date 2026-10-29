import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { createSeedState } from "../data/seed.ts"
import type { Estimate } from "../types.ts"
import { describeScopeChange, listActivity, rememberActivity } from "./activity.ts"

function job(): Estimate {
  const seed = createSeedState().estimates.find((item) => item.id === "est-jim")
  assert.ok(seed)
  return seed
}

describe("estimate activity", () => {
  it("describes a title and a price change, and skips an identical save", () => {
    const current = job()
    const renamed = { ...current, title: "Whole interior, two colors" }
    const described = describeScopeChange(current, renamed, 1800, 1962.5)
    assert.equal(described, "Title is now Whole interior, two colors. Price is now $1,962.50.")
    assert.equal(describeScopeChange(current, current, 1800, 1800), null)
  })

  it("names a room that was added", () => {
    const current = job()
    const withRoom = {
      ...current,
      areas: [...current.areas, { ...current.areas[0], id: "hall", name: "Hall" }],
    }
    const described = describeScopeChange(current, withRoom, 1800, 1800)
    assert.equal(described, "Added Hall.")
  })

  it("lists the newest change first, including the day it was created", () => {
    const current = job()
    const activity = rememberActivity(undefined, "Price is now $1,962.50.", "2026-10-29T19:00:00.000Z", "act_1")
    const listed = listActivity({
      ...current,
      activity,
      stageChanges: [{ id: "stage-1", at: "2026-10-20T15:00:00.000Z", label: "Moved to Scheduled" }],
    })
    assert.equal(listed[0]?.label, "Price is now $1,962.50.")
    assert.equal(listed.some((entry) => entry.label === "Created."), true)
    assert.equal(listed.some((entry) => entry.label === "Moved to Scheduled"), true)
    assert.ok(listed.findIndex((entry) => entry.label === "Created.") > 0)
  })
})
