import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { isSignedProposal, listProposals } from "./catalog.ts"
import { createSeedState } from "../data/seed.ts"
import { applySingleEstimatePatch } from "../data/book-payload.ts"
import { mergeCloud, type CloudSnapshot } from "../supabase/sync.ts"
import { readCompanyBook } from "../auth/directory.ts"
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

  it("preserves signature and accepted status when an autosave patch arrives from a client", () => {
    const baseState = createSeedState()
    const signedEstimate = mockEstimate({
      id: "est-preserve-test",
      clientStatus: "accepted",
      acceptedAt: "2026-11-24T10:00:00.000Z",
      signature: {
        signedName: "Carlos Mendez",
        signaturePayload: "typed:Carlos Mendez",
        signedAt: "2026-11-24T10:00:00.000Z",
        selectedLineIds: [],
      },
    })
    const stateWithSigned = {
      ...baseState,
      estimates: [signedEstimate, ...baseState.estimates],
    }

    // Client autosave sends an older in-memory copy with clientStatus="sent" and signature=null
    const staleClientPatch = {
      ...signedEstimate,
      title: "Updated Title After Signing",
      clientStatus: "sent" as const,
      signature: null,
      acceptedAt: null,
    }

    const patchedState = applySingleEstimatePatch(stateWithSigned, {
      estimate: staleClientPatch,
    })

    const result = patchedState.estimates.find((e) => e.id === "est-preserve-test")
    assert.ok(result)
    assert.equal(result.title, "Updated Title After Signing")
    assert.equal(result.clientStatus, "accepted", "clientStatus must remain accepted")
    assert.equal(result.acceptedAt, "2026-11-24T10:00:00.000Z", "acceptedAt must be preserved")
    assert.equal(result.signature?.signedName, "Carlos Mendez", "signature must be preserved")
  })

  it("hydrates signed proposals and work orders from cloud snapshot in mergeCloud", () => {
    const baseState = createSeedState()
    const estimateId = "est-maya"
    const mayaEstimate = baseState.estimates.find((e) => e.id === estimateId)!
    assert.equal(mayaEstimate.clientStatus, "draft")
    assert.equal(mayaEstimate.signature, null)

    const cloudSnapshot: CloudSnapshot = {
      clients: [],
      estimates: [
        {
          id: estimateId,
          client_id: mayaEstimate.clientId,
          room_name: "Repaint Living Room",
          length: 12,
          width: 14,
          height: 9,
          wall_sqft: 400,
          labor_hours: 6,
          gallons_needed: 2,
          total_price: 1500,
          status: "accepted",
          created_at: "2026-11-20T00:00:00Z",
          client_status: "accepted",
          signature_name: "Sarah Connor",
          signature_payload: "typed:Sarah Connor",
          signed_at: "2026-11-20T15:30:00Z",
          accepted_at: "2026-11-20T15:30:00Z",
        },
      ],
      areas: [],
      workOrders: [],
    }

    const merged = mergeCloud(baseState, cloudSnapshot)
    assert.equal(merged.changed, true)
    const target = merged.state.estimates.find((e) => e.id === estimateId)
    assert.ok(target)
    assert.equal(target.clientStatus, "accepted")
    assert.equal(target.signature?.signedName, "Sarah Connor")
    assert.equal(target.signature?.signedAt, "2026-11-20T15:30:00Z")
    assert.ok(
      merged.state.workOrders.some((o) => o.estimateId === estimateId),
      "Work order must be created for newly hydrated signed proposal"
    )
  })

  it("enforces tenant privacy: Company B cannot access Company A's book or proposal records", async () => {
    const companyA = "025a2987-baca-4773-9e50-50f781d2a472"
    const companyB = "0511b21d-8891-43b8-8584-3ffe15bb2be7"

    const bookA = await readCompanyBook(companyA)
    const bookB = await readCompanyBook(companyB)

    assert.ok(bookA, "Company A book must exist")
    assert.ok(bookB, "Company B book must exist")

    // Company A has signed proposal est-jim-27bc1d6a
    const estA = bookA.state.estimates.find((e) => e.id === "est-jim-27bc1d6a")
    assert.ok(estA, "Company A must have est-jim-27bc1d6a")
    assert.equal(isSignedProposal(estA), true, "estA must be signed")

    // Company B must NOT have est-jim-27bc1d6a
    const estB = bookB.state.estimates.find((e) => e.id === "est-jim-27bc1d6a")
    assert.equal(estB, undefined, "Company B must NOT have access to Company A's proposal")
  })
})
