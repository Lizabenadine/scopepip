import assert from "node:assert/strict"
import { describe, it } from "node:test"
import type { Estimate } from "../types.ts"
import { postProposalMessage } from "./chat.ts"

function estimate(): Estimate {
  return {
    id: "est-1",
    clientId: "client-1",
    stageId: "stage-1",
    title: "Whole interior",
    jobAddress: "22 Cedar Court",
    areas: [],
    lineItems: [],
    rates: [],
    settings: {
      hourlyRate: 75,
      hourRounding: 0.5,
      priceRounding: "none",
      materialRounding: "none",
      taxPercent: 0,
      discountKind: "percent",
      discountValue: 0,
      paymentMethodId: "check",
      surchargePercent: 0,
      expiryDays: 0,
      materialMarkup: 0,
      taxBasis: "total_job",
      minimumJobCharge: 0,
      depositPercent: 30,
    },
    scheduledOn: null,
    notes: "",
    crewNote: "",
    acceptedAt: null,
    publicToken: "token",
    clientStatus: "sent",
    signature: null,
    createdAt: "2026-10-01T00:00:00.000Z",
    updatedAt: "2026-10-01T00:00:00.000Z",
  }
}

describe("proposal chat", () => {
  it("keeps a customer question and an office reply on the proposal", () => {
    const asked = postProposalMessage(estimate(), {
      from: "customer",
      body: "  Can the bedroom be painted first?  ",
      now: "2026-10-29T18:00:00.000Z",
      id: "chat-1",
    })
    assert.equal(asked.ok, true)
    if (!asked.ok) return
    assert.equal(asked.message.body, "Can the bedroom be painted first?")
    assert.equal(asked.estimate.proposalMessages?.length, 1)

    const replied = postProposalMessage(asked.estimate, {
      from: "office",
      body: "Yes, we'll start there.",
      now: "2026-10-29T18:05:00.000Z",
      id: "chat-2",
    })
    assert.equal(replied.ok, true)
    if (!replied.ok) return
    assert.deepEqual(
      replied.estimate.proposalMessages?.map((message) => [message.from, message.body]),
      [
        ["customer", "Can the bedroom be painted first?"],
        ["office", "Yes, we'll start there."],
      ],
    )
  })

  it("rejects a blank message", () => {
    const posted = postProposalMessage(estimate(), { from: "customer", body: "   " })
    assert.deepEqual(posted, { ok: false, reason: "Write a message before sending." })
  })
})
