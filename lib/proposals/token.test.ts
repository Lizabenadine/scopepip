import assert from "node:assert/strict"
import { mkdtempSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import path from "node:path"
import { after, describe, it } from "node:test"
import { applyInboundLead } from "../leads/apply.ts"
import { createSeedState } from "../data/seed.ts"
import { mergeCloud } from "../supabase/sync.ts"
import { clientPaymentAvailability, createProposalToken, isProposalToken } from "./token.ts"

const dir = mkdtempSync(path.join(tmpdir(), "scopepipe-proposal-sec-"))
process.env.ACCOUNTS_PATH = path.join(dir, "accounts.json")
process.env.BOOKS_DIR = path.join(dir, "books")
process.env.AUTH_SECRET = "proposal-security-secret"

const {
  acceptPublicProposal,
  companyEstimate,
  publicProposal,
  readCompanyBook,
  recordPublicDepositByToken,
  signup,
  writeCompanyBook,
} = await import("../auth/directory.ts")

after(() => {
  rmSync(dir, { recursive: true, force: true })
})

describe("proposal tokens and client access isolation", () => {
  it("generates cryptographic 32-char tokens never derived from estimate IDs", () => {
    const a = createProposalToken()
    const b = createProposalToken()
    assert.equal(a.length, 32)
    assert.notEqual(a, b)
    assert.equal(isProposalToken(a), true)
    assert.equal(isProposalToken("../etc/passwd"), false)
    assert.equal(isProposalToken("bad"), false)

    const seed = createSeedState()
    const withLead = applyInboundLead(seed, {
      id: "lead-1",
      source: "website",
      createdAt: "2026-11-11T10:00:00.000Z",
      name: "Sam Homeowner",
      phone: "(503) 555-0188",
      email: "sam@example.com",
      address: "100 Elm St",
      message: "Need interior painting",
    })
    const createdLeadEstimate = withLead.estimates[0]!
    assert.equal(createdLeadEstimate.publicToken.length, 32)
    assert.equal(createdLeadEstimate.id.startsWith(createdLeadEstimate.publicToken.slice(0, 8)), false)

    const importedId = "12345678-1234-4123-8123-1234567890ab"
    const synced = mergeCloud(seed, {
      clients: [
        {
          id: "11111111-1111-4111-8111-111111111111",
          name: "Cloud Client",
          phone: "",
          email: "cloud@example.com",
          address: "",
          created_at: "2026-11-11T10:00:00.000Z",
        },
      ],
      estimates: [
        {
          id: importedId,
          client_id: "11111111-1111-4111-8111-111111111111",
          room_name: "Kitchen",
          length: 12,
          width: 10,
          height: 8,
          wall_sqft: 352,
          labor_hours: 6,
          gallons_needed: 2,
          total_price: 2400,
          status: "sent",
          created_at: "2026-11-11T10:00:00.000Z",
        },
      ],
      areas: [],
      workOrders: [],
    })
    const pulled = synced.state.estimates.find((item) => item.id === importedId)!
    assert.equal(pulled.publicToken.length, 32)
    assert.equal(pulled.publicToken.startsWith("12345678"), false)
  })

  it("strips internal contractor fields from publicProposal and isolates cross-company estimate access", async () => {
    const first = await signup({
      name: "Owner One",
      email: "owner1@proposal-sec.test",
      password: "password1",
      companyName: "One Painting",
    })
    const second = await signup({
      name: "Owner Two",
      email: "owner2@proposal-sec.test",
      password: "password1",
      companyName: "Two Painting",
    })
    assert.equal("ok" in first && first.ok, true)
    assert.equal("ok" in second && second.ok, true)
    if (!first.ok || !second.ok) return

    const seeded = createSeedState()
    const targetEst = seeded.estimates[0]!
    const targetWithInternal = {
      ...targetEst,
      clientStatus: "sent" as const,
      signature: null,
      paymentStatus: "unpaid" as const,
      depositReceipt: null,
      publicToken: createProposalToken(),
      crewNote: "Secret crew code 4499",
      leadSource: "google" as const,
      salesperson: "Internal Rep",
      salesStage: "proposal_sent" as const,
      tags: ["VIP margin"],
      estimatorId: "emp-99",
      settings: {
        ...targetEst.settings,
        hourlyRateBuild: {
          laborCostPerHour: 28,
          overheadPerHour: 14,
          sundriesPerHour: 3,
          profitPercent: 35,
        },
      },
      areas: targetEst.areas.map((a) => ({
        ...a,
        crewNote: "Private crew room note",
        surfaces: a.surfaces.map((s) => ({ ...s, crewNote: "Private surface crew note" })),
      })),
      lineItems: targetEst.lineItems.map((l) => ({
        ...l,
        crewNote: "Private line crew note",
        workOrderHours: 6,
        hiddenOnWorkOrder: true,
      })),
    }

    const firstBook = await readCompanyBook(first.user.companyId)
    assert.ok(firstBook)
    await writeCompanyBook(first.user.companyId, firstBook.revision, {
      ...seeded,
      estimates: [targetWithInternal],
    })

    const pub = await publicProposal(targetWithInternal.publicToken)
    assert.ok(pub)
    assert.equal(pub.estimate.crewNote, "")
    assert.equal(pub.estimate.settings.hourlyRateBuild, undefined)
    assert.equal(pub.estimate.leadSource, undefined)
    assert.equal(pub.estimate.salesperson, undefined)
    assert.equal(pub.estimate.tags, undefined)
    assert.equal(pub.estimate.estimatorId, undefined)
    assert.equal(pub.estimate.areas[0]?.crewNote, "")
    assert.equal(pub.estimate.areas[0]?.surfaces[0]?.crewNote, "")
    assert.equal(pub.estimate.lineItems[0]?.crewNote, "")
    assert.equal(pub.estimate.lineItems[0]?.workOrderHours, 0)

    // Cross-company estimate ID lookup returns null.
    assert.equal(await companyEstimate(second.user.companyId, targetWithInternal.id), null)
    assert.ok(await companyEstimate(first.user.companyId, targetWithInternal.id))

    // Unaccepted proposal cannot accept deposit payments server-side.
    const unpaidIntent = clientPaymentAvailability(pub.estimate, pub.paymentMethods)
    assert.equal(unpaidIntent.enabled, false)
    const blockedDeposit = await recordPublicDepositByToken(targetWithInternal.publicToken, {
      paymentIntentId: "pi_test_123",
      amount: 300,
      currency: "usd",
      depositPercent: 30,
      method: "card",
      paidAt: new Date().toISOString(),
    })
    assert.equal(blockedDeposit.ok, false)

    // After valid token acceptance, payment availability becomes enabled with server-computed deposit.
    const accepted = await acceptPublicProposal(targetWithInternal.publicToken, {
      signedName: "Maya Lin",
      signaturePayload: "typed:Maya Lin",
      signedAt: new Date().toISOString(),
      selectedLineIds: [],
    })
    assert.equal(accepted.ok, true)
    if (!accepted.ok) return
    const afterAccept = clientPaymentAvailability(accepted.estimate, pub.paymentMethods)
    assert.equal(afterAccept.enabled, true)
    assert.ok(afterAccept.depositAmount > 0)

    // Zero deposit setting disables online payment requirement cleanly.
    const noDepositEst = {
      ...accepted.estimate,
      settings: { ...accepted.estimate.settings, depositPercent: 0 },
    }
    assert.equal(clientPaymentAvailability(noDepositEst, pub.paymentMethods).enabled, false)
  })
})
