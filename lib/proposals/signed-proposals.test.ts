import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { isSignedProposal, listProposals } from "./catalog.ts"
import { createSeedState } from "../data/seed.ts"
import type { Estimate } from "../types.ts"

function mockEstimate(patch: Partial<Estimate>): Estimate {
  const seed = createSeedState().estimates[0]!
  return {
    ...seed,
    signature: null,
    acceptedAt: null,
    paymentStatus: "unpaid",
    clientStatus: "draft",
    ...patch,
  }
}

describe("Signed Proposals & Contract Access", () => {
  it("identifies signed proposals via signature, acceptance, or deposit paid", () => {
    // 1. Signature provided
    const withSig = mockEstimate({
      signature: {
        signedName: "Jane Doe",
        signaturePayload: "data:image/png;base64,123",
        signedAt: "2026-11-20T12:00:00Z",
        selectedLineIds: [],
      },
    })
    assert.equal(isSignedProposal(withSig), true)

    // 2. Client status accepted
    const acceptedStatus = mockEstimate({ clientStatus: "accepted" })
    assert.equal(isSignedProposal(acceptedStatus), true)

    // 3. AcceptedAt timestamp
    const withAcceptedAt = mockEstimate({ acceptedAt: "2026-11-20T12:00:00Z" })
    assert.equal(isSignedProposal(withAcceptedAt), true)

    // 4. Deposit paid
    const depositPaid = mockEstimate({ paymentStatus: "deposit_paid" })
    assert.equal(isSignedProposal(depositPaid), true)

    // 5. Normal draft or unsent lead is not signed
    const draftLead = mockEstimate({ clientStatus: "draft", paymentStatus: "unpaid" })
    assert.equal(isSignedProposal(draftLead), false)
  })

  it("includes signed proposals in listProposals even if clientStatus was not explicitly transitioned", () => {
    const signedEstimate = mockEstimate({
      id: "est-signed",
      signature: {
        signedName: "John Smith",
        signaturePayload: "data:image/png;base64,abc",
        signedAt: "2026-11-21T09:00:00Z",
        selectedLineIds: [],
      },
      clientStatus: "sent",
    })

    const proposals = listProposals([signedEstimate])
    assert.equal(proposals.length, 1)
    assert.equal(proposals[0]?.isSigned, true)
    assert.equal(proposals[0]?.signedName, "John Smith")
    assert.equal(proposals[0]?.signedAt, "2026-11-21T09:00:00Z")
  })
})
