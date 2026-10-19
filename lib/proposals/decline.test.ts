import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { createSeedState } from "../data/seed.ts"
import { salesStageOf } from "../pipeline/board.ts"
import { listProposals } from "./catalog.ts"
import { applyAcceptance } from "./accept.ts"
import { applyDecline } from "./decline.ts"

const declinedAt = "2026-10-03T16:00:00.000Z"

describe("applyDecline", () => {
  it("marks the proposal declined and leaves the work order list alone", () => {
    const state = createSeedState()
    const before = state.workOrders.length
    const result = applyDecline(state, "k7m2p9qx4n", declinedAt)
    assert.equal(result.ok, true)
    if (!result.ok) return
    const estimate = result.state.estimates.find((item) => item.id === "est-ortiz")
    assert.equal(estimate?.clientStatus, "declined")
    assert.equal(estimate?.declinedAt, declinedAt)
    assert.equal(estimate?.signature, null)
    assert.equal(result.state.workOrders.length, before)
    assert.equal(salesStageOf(estimate!), "proposal_sent")
    assert.equal(listProposals(result.state.estimates, result.state.clients).some((item) => item.status === "declined"), true)
  })

  it("refuses a decline after acceptance and an acceptance after a decline", () => {
    const state = createSeedState()
    const declined = applyDecline(state, "k7m2p9qx4n", declinedAt)
    assert.equal(declined.ok, true)
    if (!declined.ok) return
    const acceptedAfter = applyAcceptance(declined.state, "k7m2p9qx4n", {
      signedName: "Alex Ortiz",
      signaturePayload: "typed:Alex Ortiz",
      signedAt: declinedAt,
      selectedLineIds: [],
    })
    assert.equal(acceptedAfter.ok, false)
    if (acceptedAfter.ok) return
    assert.equal(acceptedAfter.reason, "This proposal was declined.")

    const again = applyDecline(declined.state, "k7m2p9qx4n", declinedAt)
    assert.equal(again.ok, false)

    const signed = applyDecline(state, "a4c8e1b7d092", declinedAt)
    assert.equal(signed.ok, false)
    if (signed.ok) return
    assert.equal(signed.reason, "This proposal is already accepted.")
  })
})
