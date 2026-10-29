import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { createSeedState } from "../data/seed.ts"
import type { Estimate, EstimateVersion } from "../types.ts"
import { rememberVersion, restoreVersion } from "./versions.ts"

function job(): Estimate {
  const seed = createSeedState().estimates.find((item) => item.id === "est-jim")
  assert.ok(seed)
  return {
    ...seed,
    title: "Whole interior",
    notes: "House empty Wednesday through Friday.",
    changeOrders: [
      {
        id: "co-closet",
        estimateId: seed.id,
        items: [{ id: "closet", label: "Closet shelves", amount: 125 }],
        subtotal: 125,
        clientSignatureUrl: "data:image/png;base64,iVBORw0KGgo=",
        createdAt: "2026-10-25T14:57:00.000Z",
      },
    ],
    proposalMessages: [
      {
        id: "chat_1",
        from: "customer",
        body: "Can the bedroom be painted first?",
        createdAt: "2026-10-29T18:00:00.000Z",
      },
    ],
  }
}

describe("estimate versions", () => {
  it("keeps the previous scope when the title changes and skips an identical save", () => {
    const current = job()
    const edited = { ...current, title: "Whole interior, two colors" }
    const versions = rememberVersion(undefined, current, edited, "2026-10-29T19:00:00.000Z", "ver_1")
    assert.equal(versions?.length, 1)
    assert.equal(versions?.[0]?.title, "Whole interior")
    assert.equal(versions?.[0]?.savedAt, "2026-10-29T19:00:00.000Z")
    assert.equal(rememberVersion(versions, edited, edited, "2026-10-29T19:05:00.000Z"), versions)
  })

  it("keeps the newest 20 copies", () => {
    let versions: EstimateVersion[] | undefined
    let current = job()
    for (let index = 1; index <= 25; index += 1) {
      const next = { ...current, title: `Copy ${index}` }
      versions = rememberVersion(versions, current, next, `2026-10-29T19:${String(index).padStart(2, "0")}:00.000Z`, `ver_${index}`)
      current = next
    }
    assert.equal(versions?.length, 20)
    assert.equal(versions?.[0]?.title, "Copy 24")
    assert.equal(versions?.[19]?.title, "Copy 5")
  })

  it("restores the older scope and leaves the signature, chat, and change order", () => {
    const current = job()
    const older: EstimateVersion = {
      id: "ver_old",
      savedAt: "2026-10-20T15:00:00.000Z",
      title: "First walkthrough",
      jobAddress: current.jobAddress,
      estimateKind: current.estimateKind,
      areas: [],
      lineItems: [],
      rates: current.rates,
      settings: current.settings,
      notes: "First visit.",
      crewNote: current.crewNote,
    }
    const estimate: Estimate = { ...current, versions: [older] }
    const restored = restoreVersion(estimate, "ver_old", "2026-10-29T19:10:00.000Z")
    assert.equal(restored.ok, true)
    if (!restored.ok) return
    assert.equal(restored.restored, true)
    assert.equal(restored.estimate.title, "First walkthrough")
    assert.equal(restored.estimate.notes, "First visit.")
    assert.equal(restored.estimate.areas.length, 0)
    assert.equal(restored.estimate.publicToken, current.publicToken)
    assert.equal(restored.estimate.signature, current.signature)
    assert.equal(restored.estimate.acceptedAt, current.acceptedAt)
    assert.deepEqual(restored.estimate.changeOrders, current.changeOrders)
    assert.deepEqual(restored.estimate.proposalMessages, current.proposalMessages)
    assert.equal(restored.estimate.versions?.[0]?.title, "Whole interior")
    assert.equal(restoreVersion(restored.estimate, "missing", "2026-10-29T19:11:00.000Z").ok, false)
    const again = restoreVersion(restored.estimate, "ver_old", "2026-10-29T19:12:00.000Z")
    assert.equal(again.ok, true)
    if (!again.ok) return
    assert.equal(again.restored, false)
    assert.equal(again.estimate, restored.estimate)
  })
})
