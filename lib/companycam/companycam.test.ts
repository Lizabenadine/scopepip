import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  clearCompanyCamCredentials,
  decryptCompanyCamToken,
  encryptCompanyCamToken,
  getCompanyCamStatus,
  getDecryptedCompanyCamToken,
  readCompanyCamCredentials,
  writeCompanyCamCredentials,
} from "./credentials.ts"
import {
  matchCompanyCamProject,
  parseCompanyCamPhotos,
  parseCompanyCamProjects,
} from "./match.ts"
import { syncCompanyCamWithToken, verifyCompanyCamToken } from "./api.ts"

describe("CompanyCam encrypted credentials & multi-tenant isolation", () => {
  it("encrypts and decrypts tokens with AES-256-GCM without exposing raw token", () => {
    const rawToken = "cc_live_secret_token_1234567890abcdef"
    const encrypted = encryptCompanyCamToken(rawToken)

    assert.notEqual(encrypted.ciphertext, rawToken)
    assert.ok(encrypted.iv)
    assert.ok(encrypted.tag)

    const decrypted = decryptCompanyCamToken(encrypted)
    assert.equal(decrypted, rawToken)
  })

  it("fails gracefully and returns null when ciphertext or tag is tampered", () => {
    const rawToken = "cc_live_secret_token_1234567890abcdef"
    const encrypted = encryptCompanyCamToken(rawToken)

    // Tamper with ciphertext
    const tamperedCipher = {
      ...encrypted,
      ciphertext: encrypted.ciphertext.slice(0, -4) + "0000",
    }
    assert.equal(decryptCompanyCamToken(tamperedCipher), null)

    // Tamper with tag
    const tamperedTag = {
      ...encrypted,
      tag: "00000000000000000000000000000000",
    }
    assert.equal(decryptCompanyCamToken(tamperedTag), null)
  })

  it("enforces cross-contractor isolation: company A cannot see or decrypt company B's credentials", async () => {
    const companyA = "contractor_alpha_test_1"
    const companyB = "contractor_beta_test_2"
    const tokenA = "cc_token_for_alpha_only_9999"
    const tokenB = "cc_token_for_beta_only_8888"

    await writeCompanyCamCredentials(companyA, tokenA)
    await writeCompanyCamCredentials(companyB, tokenB)

    // Read status - never reveals the raw token, only last4
    const statusA = await getCompanyCamStatus(companyA)
    const statusB = await getCompanyCamStatus(companyB)

    assert.equal(statusA.connected, true)
    assert.equal(statusA.last4, "9999")
    // Ensure raw token is not exposed in status
    assert.equal("ciphertext" in statusA, false)
    assert.equal("token" in statusA, false)

    assert.equal(statusB.connected, true)
    assert.equal(statusB.last4, "8888")

    // Verify decrypted tokens are completely isolated
    assert.equal(await getDecryptedCompanyCamToken(companyA), tokenA)
    assert.equal(await getDecryptedCompanyCamToken(companyB), tokenB)

    // Disconnecting company A does not affect company B
    await clearCompanyCamCredentials(companyA)
    assert.equal((await getCompanyCamStatus(companyA)).connected, false)
    assert.equal(await getDecryptedCompanyCamToken(companyA), null)

    // Company B is still intact and connected
    assert.equal((await getCompanyCamStatus(companyB)).connected, true)
    assert.equal(await getDecryptedCompanyCamToken(companyB), tokenB)

    // Clean up
    await clearCompanyCamCredentials(companyB)
  })

  it("returns disconnected for an account with no credentials saved", async () => {
    const status = await getCompanyCamStatus("unconnected_contractor_xyz")
    assert.equal(status.connected, false)
    assert.equal(status.last4, "")
    assert.equal(await getDecryptedCompanyCamToken("unconnected_contractor_xyz"), null)
  })
})

describe("CompanyCam address matching & ambiguity prevention", () => {
  const projects = parseCompanyCamProjects([
    {
      id: "proj_1",
      name: "Residential Repaint",
      address: { street_address_1: "742 Evergreen Terrace", city: "Springfield", state: "OR" },
      project_url: "https://app.companycam.com/projects/proj_1",
    },
    {
      id: "proj_2",
      name: "Apartment Unit A",
      address: { street_address_1: "100 Main Street", city: "Springfield", state: "OR" },
      project_url: "https://app.companycam.com/projects/proj_2",
    },
    {
      id: "proj_3",
      name: "Apartment Unit B",
      address: { street_address_1: "100 Main Street", city: "Springfield", state: "OR" },
      project_url: "https://app.companycam.com/projects/proj_3",
    },
  ])

  it("matches unambiguously when there is exactly one matching project", () => {
    const match = matchCompanyCamProject(
      { address: "742 Evergreen Terr, Springfield", title: "Whole House" },
      projects,
    )
    assert.ok(match)
    assert.equal(match.id, "proj_1")
  })

  it("refuses to attach photos when the address match is ambiguous (multiple matching projects)", () => {
    // 100 Main Street has both proj_2 and proj_3
    const match = matchCompanyCamProject(
      { address: "100 Main St, Springfield", title: "Painting job" },
      projects,
    )
    // Ambiguous: should be null to prevent attaching wrong photos
    assert.equal(match, null)
  })

  it("matches ambiguous address when explicit projectId is supplied", () => {
    const match = matchCompanyCamProject(
      { address: "100 Main St, Springfield", title: "Unit B", projectId: "proj_3" },
      projects,
    )
    assert.ok(match)
    assert.equal(match.id, "proj_3")
  })

  it("does not match when address is blank or lacks a street number", () => {
    const match1 = matchCompanyCamProject(
      { address: "Springfield, OR", title: "Commercial work" },
      projects,
    )
    assert.equal(match1, null)

    const match2 = matchCompanyCamProject(
      { address: "", title: "Estimate for kitchen" },
      projects,
    )
    assert.equal(match2, null)
  })
})

describe("CompanyCam photo parsing & deduplication", () => {
  it("imports at most 12 photos per work order", () => {
    const rawPhotos = Array.from({ length: 20 }, (_, i) => ({
      id: `photo_${i}`,
      uris: [{ type: "web", uri: `https://cdn.example.com/photos/${i}.jpg` }],
      captured_at: 1760000000 + i,
    }))

    const parsed = parseCompanyCamPhotos(rawPhotos)
    assert.equal(parsed.length, 12)
    assert.equal(parsed[0]?.id, "photo_0")
    assert.equal(parsed[11]?.id, "photo_11")
  })

  it("prevents duplicate photos within payload and against existing photos", () => {
    const rawPhotos = [
      { id: "photo_1", uris: [{ type: "web", uri: "https://cdn.example.com/p1.jpg" }] },
      { id: "photo_1", uris: [{ type: "web", uri: "https://cdn.example.com/p1.jpg" }] }, // duplicate in payload
      { id: "photo_2", uris: [{ type: "web", uri: "https://cdn.example.com/p2.jpg" }] },
      { id: "photo_3", uris: [{ type: "web", uri: "https://cdn.example.com/p1.jpg" }] }, // duplicate URL
    ]

    const existingIds = ["photo_2"] // photo_2 already exists on work order
    const parsed = parseCompanyCamPhotos(rawPhotos, existingIds)

    assert.equal(parsed.length, 1)
    assert.equal(parsed[0]?.id, "photo_1")
  })

  it("rejects insecure HTTP photo URLs", () => {
    const rawPhotos = [
      { id: "p1", uris: [{ type: "web", uri: "http://insecure.example.com/p1.jpg" }] },
      { id: "p2", uris: [{ type: "web", uri: "https://secure.example.com/p2.jpg" }] },
    ]
    const parsed = parseCompanyCamPhotos(rawPhotos)
    assert.equal(parsed.length, 1)
    assert.equal(parsed[0]?.id, "p2")
  })
})

describe("CompanyCam token verification & error handling", () => {
  it("rejects empty or very short tokens without making network requests", async () => {
    const emptyResult = await verifyCompanyCamToken("")
    assert.equal(emptyResult.ok, false)

    const shortResult = await verifyCompanyCamToken("short")
    assert.equal(shortResult.ok, false)
  })

  it("sync fails gracefully when token is rejected by CompanyCam API", async () => {
    // Calling sync with a bad token should return error detail without crashing
    const result = await syncCompanyCamWithToken("invalid_mock_token_12345", [
      { estimateId: "est-1", address: "742 Evergreen Terr", title: "Paint" },
    ])
    assert.equal(result.connected, true)
    assert.equal(result.jobs.length, 0)
    assert.ok(result.detail.length > 0)
  })
})
