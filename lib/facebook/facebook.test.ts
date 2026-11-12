import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  clearFacebookCredentials,
  decryptFacebookToken,
  encryptFacebookToken,
  getCompanyForFacebookPage,
  getDecryptedFacebookToken,
  getFacebookStatus,
  writeFacebookCredentials,
} from "./credentials.ts"
import { GET as leadSourceGET, POST as leadSourcePOST } from "../../app/api/leads/[source]/route.ts"
import { GET as oauthStartGET } from "../../app/api/facebook/oauth/start/route.ts"
import { GET as oauthCallbackGET } from "../../app/api/facebook/oauth/callback/route.ts"
import { readCompanyBook, writeCompanyBook, signup, authSecret } from "../auth/directory.ts"
import { signOfficeSession } from "../auth/session-token.ts"
import { createSeedState } from "../data/seed.ts"

describe("Facebook & Instagram Lead Ads Integration", () => {
  it("verifies webhook GET subscription challenge with FACEBOOK_VERIFY_TOKEN", async () => {
    process.env.FACEBOOK_VERIFY_TOKEN = "test_fb_verify_token_999"

    // Valid subscription verification request
    const validUrl = "http://localhost:3000/api/leads/facebook?hub.mode=subscribe&hub.verify_token=test_fb_verify_token_999&hub.challenge=test_challenge_abc_123"
    const validReq = new Request(validUrl)
    const validRes = await leadSourceGET(validReq, { params: Promise.resolve({ source: "facebook" }) })

    assert.equal(validRes.status, 200)
    assert.equal(await validRes.text(), "test_challenge_abc_123")

    // Invalid verify token request
    const invalidUrl = "http://localhost:3000/api/leads/facebook?hub.mode=subscribe&hub.verify_token=wrong_token&hub.challenge=test_challenge_abc_123"
    const invalidReq = new Request(invalidUrl)
    const invalidRes = await leadSourceGET(invalidReq, { params: Promise.resolve({ source: "facebook" }) })

    assert.equal(invalidRes.status, 403)
  })

  it("encrypts and stores page tokens at rest with AES-256-GCM without leaking token", async () => {
    const rawToken = "EAAQWERTYUIOPASDFGHJKLZXCVBNM_secret_token_12345"
    const encrypted = encryptFacebookToken(rawToken)

    assert.notEqual(encrypted.ciphertext, rawToken)
    assert.ok(encrypted.iv)
    assert.ok(encrypted.tag)

    const decrypted = decryptFacebookToken(encrypted)
    assert.equal(decrypted, rawToken)
  })

  it("maps contractor page ID and maintains multi-tenant isolation", async () => {
    const companyA = "company_fb_test_alpha"
    const companyB = "company_fb_test_beta"
    const pageIdA = "fb_page_11111"
    const pageIdB = "fb_page_22222"
    const tokenA = "access_token_alpha_page_token"
    const tokenB = "access_token_beta_page_token"

    await writeFacebookCredentials(companyA, {
      pageId: pageIdA,
      pageName: "Alpha Painting LLC",
      pageAccessToken: tokenA,
    })

    await writeFacebookCredentials(companyB, {
      pageId: pageIdB,
      pageName: "Beta Painting Pros",
      pageAccessToken: tokenB,
    })

    // Check status does not expose token
    const statusA = await getFacebookStatus(companyA)
    assert.equal(statusA.connected, true)
    assert.equal(statusA.pageId, pageIdA)
    assert.equal(statusA.pageName, "Alpha Painting LLC")
    assert.equal("ciphertext" in statusA, false)
    assert.equal("token" in statusA, false)

    // Check O(1) page to company mapping
    const mapA = await getCompanyForFacebookPage(pageIdA)
    assert.ok(mapA)
    assert.equal(mapA.companyId, companyA)

    const mapB = await getCompanyForFacebookPage(pageIdB)
    assert.ok(mapB)
    assert.equal(mapB.companyId, companyB)

    // Token isolation
    assert.equal(await getDecryptedFacebookToken(companyA), tokenA)
    assert.equal(await getDecryptedFacebookToken(companyB), tokenB)

    // Disconnecting company A removes credentials and page mapping without affecting company B
    await clearFacebookCredentials(companyA)
    assert.equal((await getFacebookStatus(companyA)).connected, false)
    assert.equal(await getCompanyForFacebookPage(pageIdA), null)

    // Company B is unaffected
    assert.equal((await getFacebookStatus(companyB)).connected, true)
    assert.equal(await getDecryptedFacebookToken(companyB), tokenB)

    // Clean up
    await clearFacebookCredentials(companyB)
  })

  it("delivers Facebook Lead Ads webhook to the correct contractor and prevents cross-assignment", async () => {
    const userA = await signup({
      name: "FB Contractor Alpha",
      email: `fb_alpha_${Date.now()}@test.local`,
      password: "password123",
      companyName: "Alpha Home Improvements",
    })
    const userB = await signup({
      name: "FB Contractor Beta",
      email: `fb_beta_${Date.now()}@test.local`,
      password: "password123",
      companyName: "Beta Home Renovations",
    })

    assert.ok(userA.ok)
    assert.ok(userB.ok)
    if (!userA.ok || !userB.ok) return

    const companyA = userA.user.companyId
    const companyB = userB.user.companyId
    const pageIdA = `page_alpha_${Date.now()}`

    // Connect pageIdA to Company A
    await writeFacebookCredentials(companyA, {
      pageId: pageIdA,
      pageName: "Alpha Home Improvements",
      pageAccessToken: "test_token_alpha",
    })

    // Simulate Meta Lead Ads Webhook with field_data for pageIdA
    const webhookPayload = {
      object: "page",
      entry: [
        {
          id: pageIdA,
          time: 1700000000,
          changes: [
            {
              field: "leadgen",
              value: {
                ad_id: "ad_101",
                form_id: "form_202",
                leadgen_id: "leadgen_303",
                created_time: 1700000000,
                page_id: pageIdA,
                field_data: [
                  { name: "full_name", values: ["Marcus Vance"] },
                  { name: "phone_number", values: ["(503) 555-8899"] },
                  { name: "email", values: ["marcus@vance.local"] },
                  { name: "street_address", values: ["888 Cedar Blvd"] },
                  { name: "city", values: ["Portland"] },
                  { name: "job_description", values: ["Complete cabinet and trim repaint"] },
                ],
              },
            },
          ],
        },
      ],
    }

    const postReq = new Request("http://localhost:3000/api/leads/facebook", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(webhookPayload),
    })

    const postRes = await leadSourcePOST(postReq, { params: Promise.resolve({ source: "facebook" }) })
    assert.equal(postRes.status, 200)

    // Verify lead landed in Contractor A's company book
    const bookA = await readCompanyBook(companyA)
    assert.ok(bookA)
    const leadInA = bookA.state.clients.find((c) => c.name === "Marcus Vance")
    assert.ok(leadInA)
    assert.equal(leadInA.phone, "(503) 555-8899")

    // Verify Contractor B NEVER receives this lead (Isolation)
    const bookB = await readCompanyBook(companyB)
    assert.ok(bookB)
    const leakedLeadInB = bookB.state.clients.find((c) => c.name === "Marcus Vance")
    assert.equal(leakedLeadInB, undefined)

    // Clean up
    await clearFacebookCredentials(companyA)
  })

  it("safely ignores leads for unmapped Facebook pages to prevent assigning to the wrong contractor", async () => {
    const unmappedPagePayload = {
      object: "page",
      entry: [
        {
          id: "unknown_page_99999999",
          changes: [
            {
              field: "leadgen",
              value: {
                page_id: "unknown_page_99999999",
                field_data: [
                  { name: "full_name", values: ["Stranger Danger"] },
                  { name: "phone_number", values: ["555-0000"] },
                ],
              },
            },
          ],
        },
      ],
    }

    const req = new Request("http://localhost:3000/api/leads/facebook", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(unmappedPagePayload),
    })

    const res = await leadSourcePOST(req, { params: Promise.resolve({ source: "facebook" }) })
    assert.equal(res.status, 200)
    const data = (await res.json()) as { ok: boolean; stored: number }
    // Should safely store 0 leads when page is unmapped
    assert.equal(data.stored, 0)
  })

  it("handles OAuth start authorization redirect flow", async () => {
    const user = await signup({
      name: "FB OAuth Contractor",
      email: `fb_oauth_${Date.now()}@test.local`,
      password: "password123",
      companyName: "OAuth Contractor Co",
    })
    assert.ok(user.ok)
    if (!user.ok) return

    const token = signOfficeSession(
      {
        id: user.user.id,
        name: user.user.name,
        email: user.user.email,
        role: "owner",
        companyId: user.user.companyId,
        companyName: "OAuth Contractor Co",
        companySlug: "oauth-contractor-co",
      },
      authSecret(),
    )

    // Case 1: Unconfigured OAuth app on host
    delete process.env.FACEBOOK_APP_ID
    delete process.env.FACEBOOK_APP_SECRET
    const req1 = new Request("http://localhost:3000/api/facebook/oauth/start", {
      headers: { cookie: `scopepipe_session=${token}` },
    })
    const res1 = await oauthStartGET(req1)
    assert.equal(res1.status, 302)
    assert.ok(res1.headers.get("location")?.includes("facebook_error=missing_app_id"))

    // Case 2: Configured OAuth app
    process.env.FACEBOOK_APP_ID = "mock_facebook_app_123"
    process.env.FACEBOOK_APP_SECRET = "mock_facebook_secret_456"
    const req2 = new Request("http://localhost:3000/api/facebook/oauth/start", {
      headers: { cookie: `scopepipe_session=${token}` },
    })
    const res2 = await oauthStartGET(req2)
    assert.equal(res2.status, 302)
    const location = res2.headers.get("location") || ""
    assert.ok(location.startsWith("https://www.facebook.com/v19.0/dialog/oauth"))
    assert.ok(location.includes("client_id=mock_facebook_app_123"))
    assert.ok(location.includes("state="))
    assert.ok(location.includes("leads_retrieval"))
  })

  it("handles OAuth callback cancellation and invalid state safely", async () => {
    // Case 1: Error from Facebook (user cancelled dialog)
    const cancelReq = new Request("http://localhost:3000/api/facebook/oauth/callback?error=access_denied&error_description=User%20denied%20permissions")
    const cancelRes = await oauthCallbackGET(cancelReq)
    assert.equal(cancelRes.status, 302)
    assert.ok(cancelRes.headers.get("location")?.includes("facebook_error=User%20denied%20permissions"))

    // Case 2: Invalid or forged state
    const forgedReq = new Request("http://localhost:3000/api/facebook/oauth/callback?code=mock_code&state=fake_forged_state")
    const forgedRes = await oauthCallbackGET(forgedReq)
    assert.equal(forgedRes.status, 302)
    assert.ok(forgedRes.headers.get("location")?.includes("facebook_error=invalid_state"))
  })
})
