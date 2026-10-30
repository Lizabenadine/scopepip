import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { answerSubcontractorOffer, createSubcontractorOffer, offerSendBlock } from "./offers.ts"
import type { WorkOrder } from "../types.ts"

function order(offers: WorkOrder["offers"] = []): WorkOrder {
  return {
    estimateId: "est-1",
    prepNotes: "",
    hourDisplay: "all",
    checklist: [],
    photos: [],
    status: "scheduled",
    assignedCrewId: null,
    scheduledStartDate: "2026-10-31",
    notifiedAt: null,
    offers,
  }
}

describe("subcontractor offers", () => {
  it("makes a link for a named person with an email", () => {
    const offer = createSubcontractorOffer({
      name: " Maya Chen ",
      email: "maya@crew.test",
      now: "2026-10-30T12:00:00.000Z",
      token: "abc123def456",
      id: "offer-1",
    })
    assert.deepEqual(offer, {
      id: "offer-1",
      token: "abc123def456",
      name: "Maya Chen",
      email: "maya@crew.test",
      status: "sent",
      sentAt: "2026-10-30T12:00:00.000Z",
    })
    assert.equal(createSubcontractorOffer({ name: "", email: "maya@crew.test" }), null)
    assert.equal(createSubcontractorOffer({ name: "Maya", email: "maya" }), null)
  })

  it("lets the next person get the job after the first one passes", () => {
    const first = createSubcontractorOffer({
      name: "Maya Chen",
      email: "maya@crew.test",
      token: "aaaaaaaaaaaa",
      id: "offer-1",
    })
    const second = createSubcontractorOffer({
      name: "Luis Ortega",
      email: "luis@crew.test",
      token: "bbbbbbbbbbbb",
      id: "offer-2",
    })
    assert.ok(first && second)
    if (!first || !second) return
    assert.equal(
      offerSendBlock([first], "luis@crew.test"),
      "This work order is already with a subcontractor. Wait until they accept or pass.",
    )
    const passed = answerSubcontractorOffer(order([first]), first.token, "decline", "2026-10-30T18:00:00.000Z")
    assert.equal(passed.ok, true)
    if (!passed.ok) return
    assert.equal(passed.order.subSignature, undefined)
    assert.equal(offerSendBlock(passed.order.offers, "luis@crew.test"), null)
    const accepted = answerSubcontractorOffer(
      { ...passed.order, offers: [...(passed.order.offers ?? []), second] },
      second.token,
      "accept",
      "2026-10-30T19:00:00.000Z",
    )
    assert.equal(accepted.ok, true)
    if (!accepted.ok) return
    assert.equal(accepted.order.subSignature, "Luis Ortega")
    assert.equal(accepted.order.subSignedDate, "2026-10-30")
    const late = answerSubcontractorOffer(accepted.order, first.token, "accept", "2026-10-30T20:00:00.000Z")
    assert.equal(late.ok, true)
    if (!late.ok) return
    assert.equal(late.order.offers?.find((item) => item.token === first.token)?.status, "declined")
  })

  it("keeps a second acceptance from replacing the person who took the job", () => {
    const first = createSubcontractorOffer({ name: "Maya Chen", email: "maya@crew.test", token: "aaaaaaaaaaaa", id: "offer-1" })
    const second = createSubcontractorOffer({ name: "Luis Ortega", email: "luis@crew.test", token: "bbbbbbbbbbbb", id: "offer-2" })
    assert.ok(first && second)
    if (!first || !second) return
    const accepted = answerSubcontractorOffer(order([first, second]), first.token, "accept", "2026-10-30T18:00:00.000Z")
    assert.equal(accepted.ok, true)
    if (!accepted.ok) return
    const blocked = answerSubcontractorOffer(accepted.order, second.token, "accept", "2026-10-30T19:00:00.000Z")
    assert.deepEqual(blocked, { ok: false, reason: "Another subcontractor already accepted this job." })
    assert.equal(offerSendBlock(accepted.order.offers, "luis@crew.test"), "A subcontractor already accepted this job.")
  })
})
