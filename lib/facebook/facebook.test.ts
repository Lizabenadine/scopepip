import assert from "node:assert/strict"
import { describe, it } from "node:test"
import crypto from "node:crypto"
import {
  clearFacebookCredentials,
  decryptFacebookToken,
  encryptFacebookToken,
  getCompanyForFacebookPage,
  getDecryptedFacebookToken,
  getFacebookStatus,
  verifyFacebookWebhookSignature,
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

    // Case 3: Facebook Login for Business with config_id
    process.env.FACEBOOK_CONFIG_ID = "business_cfg_789"
    const req3 = new Request("http://localhost:3000/api/facebook/oauth/start", {
      headers: { cookie: `scopepipe_session=${token}` },
    })
    const res3 = await oauthStartGET(req3)
    assert.equal(res3.status, 302)
    const location3 = res3.headers.get("location") || ""
    assert.ok(location3.includes("config_id=business_cfg_789"))
    assert.ok(location3.includes("override_default_response_type=true"))
    assert.equal(location3.includes("scope="), false)
    delete process.env.FACEBOOK_CONFIG_ID
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

  it("verifies webhook signature using FACEBOOK_APP_SECRET and rejects forged payloads", async () => {
    process.env.FACEBOOK_APP_SECRET = "super_secret_app_key_999"
    const payload = JSON.stringify({ object: "page", entry: [{ id: "mock_page_id", changes: [] }] })

    // Valid HMAC SHA256
    const validHmac = crypto.createHmac("sha256", "super_secret_app_key_999").update(payload).digest("hex")
    const validReq = new Request("http://localhost:3000/api/leads/facebook", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-hub-signature-256": `sha256=${validHmac}`,
      },
      body: payload,
    })
    const validRes = await leadSourcePOST(validReq, { params: Promise.resolve({ source: "facebook" }) })
    assert.equal(validRes.status, 200)

    // Forged signature
    const forgedReq = new Request("http://localhost:3000/api/leads/facebook", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-hub-signature-256": "sha256=bad_hex_signature_0000000000000000000000000000000000000000000000000000000000000000",
      },
      body: payload,
    })
    const forgedRes = await leadSourcePOST(forgedReq, { params: Promise.resolve({ source: "facebook" }) })
    assert.equal(forgedRes.status, 403)
    delete process.env.FACEBOOK_APP_SECRET
  })

  it("creates a new pipeline lead from a Facebook Messenger inquiry and maintains contractor isolation", async () => {
    const userA = await signup({
      name: "Messenger Contractor A",
      email: `msg_alpha_${Date.now()}@test.local`,
      password: "password123",
      companyName: "Alpha Painter LLC",
    })
    const userB = await signup({
      name: "Messenger Contractor B",
      email: `msg_beta_${Date.now()}@test.local`,
      password: "password123",
      companyName: "Beta Painter LLC",
    })

    assert.ok(userA.ok && userB.ok)
    if (!userA.ok || !userB.ok) return

    const companyA = userA.user.companyId
    const companyB = userB.user.companyId
    const pageIdA = `msg_page_a_${Date.now()}`
    const senderPsid = `psid_homeowner_${Date.now()}`

    await writeFacebookCredentials(companyA, {
      pageId: pageIdA,
      pageName: "Alpha Painter Business Page",
      pageAccessToken: "test_page_access_token",
    })

    const messengerPayload = {
      object: "page",
      entry: [
        {
          id: pageIdA,
          time: 1700000000,
          messaging: [
            {
              sender: { id: senderPsid },
              recipient: { id: pageIdA },
              timestamp: 1700000000,
              message: {
                mid: "mid_msg_101",
                text: "Hi! Can I get a quote for exterior painting this month?",
              },
            },
          ],
        },
      ],
    }

    const postReq = new Request("http://localhost:3000/api/leads/facebook", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(messengerPayload),
    })

    const postRes = await leadSourcePOST(postReq, { params: Promise.resolve({ source: "facebook" }) })
    assert.equal(postRes.status, 200)

    // Verify Contractor A has the new lead in their company book
    const bookA = await readCompanyBook(companyA)
    assert.ok(bookA)
    const estimateA = bookA.state.estimates.find((est) => est.notes.includes(senderPsid))
    assert.ok(estimateA)
    assert.ok(estimateA.notes.includes("Can I get a quote for exterior painting"))
    assert.equal(estimateA.leadSource, "facebook")

    // Verify Contractor B NEVER receives this Messenger lead (100% contractor privacy)
    const bookB = await readCompanyBook(companyB)
    assert.ok(bookB)
    const leakedInB = bookB.state.estimates.find((est) => est.notes.includes(senderPsid))
    assert.equal(leakedInB, undefined)

    // Clean up
    await clearFacebookCredentials(companyA)
  })

  it("updates the existing lead on additional messages from the same sender without creating duplicates", async () => {
    const user = await signup({
      name: "Messenger Threading Contractor",
      email: `msg_thread_${Date.now()}@test.local`,
      password: "password123",
      companyName: "Threading Painter LLC",
    })
    assert.ok(user.ok)
    if (!user.ok) return

    const companyId = user.user.companyId
    const pageId = `msg_thread_page_${Date.now()}`
    const senderPsid = `psid_repeat_customer_${Date.now()}`

    await writeFacebookCredentials(companyId, {
      pageId,
      pageName: "Threading Painter Page",
      pageAccessToken: "test_token",
    })

    // 1. Initial Inquiry
    const msg1 = {
      object: "page",
      entry: [
        {
          id: pageId,
          messaging: [
            {
              sender: { id: senderPsid },
              recipient: { id: pageId },
              message: { mid: "m1", text: "First message: We need 3 bedrooms painted." },
            },
          ],
        },
      ],
    }
    const res1 = await leadSourcePOST(
      new Request("http://localhost:3000/api/leads/facebook", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(msg1),
      }),
      { params: Promise.resolve({ source: "facebook" }) },
    )
    assert.equal(res1.status, 200)

    const bookAfter1 = await readCompanyBook(companyId)
    assert.ok(bookAfter1)
    const initialEstimateCount = bookAfter1.state.estimates.length
    const initialClientCount = bookAfter1.state.clients.length

    // 2. Second message from the exact same sender
    const msg2 = {
      object: "page",
      entry: [
        {
          id: pageId,
          messaging: [
            {
              sender: { id: senderPsid },
              recipient: { id: pageId },
              message: { mid: "m2", text: "Second message: Also we'd like ceilings included." },
            },
          ],
        },
      ],
    }
    const res2 = await leadSourcePOST(
      new Request("http://localhost:3000/api/leads/facebook", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(msg2),
      }),
      { params: Promise.resolve({ source: "facebook" }) },
    )
    assert.equal(res2.status, 200)

    const bookAfter2 = await readCompanyBook(companyId)
    assert.ok(bookAfter2)

    // MUST NOT create duplicate estimates or clients
    assert.equal(bookAfter2.state.estimates.length, initialEstimateCount, "Estimates count should remain unchanged")
    assert.equal(bookAfter2.state.clients.length, initialClientCount, "Clients count should remain unchanged")

    // The existing estimate must contain BOTH messages
    const threadedEstimate = bookAfter2.state.estimates.find((est) => est.notes.includes(senderPsid))
    assert.ok(threadedEstimate)
    assert.ok(threadedEstimate.notes.includes("First message: We need 3 bedrooms painted."))
    assert.ok(threadedEstimate.notes.includes("Second message: Also we'd like ceilings included."))

    // Clean up
    await clearFacebookCredentials(companyId)
  })
})
