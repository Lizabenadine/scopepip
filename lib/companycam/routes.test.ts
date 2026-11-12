import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { GET as connectionGET, POST as connectionPOST } from "../../app/api/companycam/connection/route.ts"
import { POST as syncPOST } from "../../app/api/companycam/sync/route.ts"
import { authSecret } from "../auth/directory.ts"
import { signOfficeSession } from "../auth/session-token.ts"
import { sessionCookie, type OfficeSession } from "../auth/session.ts"
import { clearCompanyCamCredentials, writeCompanyCamCredentials, getCompanyCamStatus } from "./credentials.ts"

function mockOfficeSession(companyId: string, email = "owner@test.local"): OfficeSession {
  return {
    id: `user-${companyId}`,
    companyId,
    companyName: "Test Company",
    companySlug: companyId,
    email,
    name: "Test Contractor",
    role: "owner",
  }
}

function sessionRequest(url: string, session: OfficeSession | null, init?: RequestInit): Request {
  const headers = new Headers(init?.headers)
  if (session) {
    const token = signOfficeSession(session, authSecret())
    const cookie = sessionCookie(token)
    const cookieVal = cookie.split(";")[0] ?? ""
    headers.set("cookie", cookieVal)
  }
  return new Request(url, { ...init, headers })
}

describe("CompanyCam API routes security & authorization", () => {
  it("rejects unauthenticated GET to /api/companycam/connection with 401", async () => {
    const req = new Request("http://localhost:3000/api/companycam/connection")
    const res = await connectionGET(req)
    assert.equal(res.status, 401)
  })

  it("rejects unauthenticated POST to /api/companycam/connection with 401", async () => {
    const req = new Request("http://localhost:3000/api/companycam/connection", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "test" }),
    })
    const res = await connectionPOST(req)
    assert.equal(res.status, 401)
  })

  it("rejects unauthenticated POST to /api/companycam/sync with 401", async () => {
    const req = new Request("http://localhost:3000/api/companycam/sync", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ jobs: [] }),
    })
    const res = await syncPOST(req)
    assert.equal(res.status, 401)
  })

  it("returns contractor-specific status for authenticated user", async () => {
    const contractorId = "company-route-test-1"
    const session = mockOfficeSession(contractorId)

    // Initially disconnected
    await clearCompanyCamCredentials(contractorId)
    const getReq1 = sessionRequest("http://localhost:3000/api/companycam/connection", session)
    const res1 = await connectionGET(getReq1)
    assert.equal(res1.status, 200)
    const data1 = (await res1.json()) as { connected: boolean; last4: string }
    assert.equal(data1.connected, false)

    // Save mock token directly in credentials
    await writeCompanyCamCredentials(contractorId, "token_sample_1234")
    const getReq2 = sessionRequest("http://localhost:3000/api/companycam/connection", session)
    const res2 = await connectionGET(getReq2)
    assert.equal(res2.status, 200)
    const data2 = (await res2.json()) as { connected: boolean; last4: string }
    assert.equal(data2.connected, true)
    assert.equal(data2.last4, "1234")

    // Disconnect via POST route
    const discReq = sessionRequest("http://localhost:3000/api/companycam/connection", session, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "disconnect" }),
    })
    const discRes = await connectionPOST(discReq)
    assert.equal(discRes.status, 200)
    const discData = (await discRes.json()) as { connected: boolean }
    assert.equal(discData.connected, false)

    // Verify status is disconnected
    assert.equal((await getCompanyCamStatus(contractorId)).connected, false)
  })

  it("rejects invalid API token on save with 400 and reason without saving", async () => {
    const contractorId = "company-route-test-2"
    const session = mockOfficeSession(contractorId)
    await clearCompanyCamCredentials(contractorId)

    // Attempt save with invalid mock token (CompanyCam API will reject it)
    const saveReq = sessionRequest("http://localhost:3000/api/companycam/connection", session, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "save", token: "invalid_fake_token_12345" }),
    })
    const saveRes = await connectionPOST(saveReq)
    assert.equal(saveRes.status, 400)
    const data = (await saveRes.json()) as { ok: boolean; reason: string }
    assert.equal(data.ok, false)
    assert.ok(data.reason)

    // Ensure it was NOT saved
    const status = await getCompanyCamStatus(contractorId)
    assert.equal(status.connected, false)
  })
})
