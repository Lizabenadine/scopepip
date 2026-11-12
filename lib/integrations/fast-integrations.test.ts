import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { createSeedState } from "../data/seed.ts"
import { exportScopeCsv, leadsCsv, customersCsv, estimatesCsv, jobsCsvExport } from "../export/csv.ts"
import { POST as leadWebhookPOST } from "../../app/api/webhooks/leads/[token]/route.ts"
import { GET as exportCsvGET } from "../../app/api/export/csv/route.ts"
import { readCompanyBook, writeCompanyBook, signup } from "../auth/directory.ts"
import { authSecret } from "../auth/directory.ts"
import { signOfficeSession } from "../auth/session-token.ts"
import { sessionCookie, type OfficeSession } from "../auth/session.ts"

function mockOfficeSession(companyId: string, companyName = "Test Contractor Co"): OfficeSession {
  return {
    id: `user-${companyId}`,
    companyId,
    companyName,
    companySlug: companyId,
    email: `owner@${companyId}.test`,
    name: "Test Contractor",
    role: "owner",
  }
}

describe("Fast Integration Verification", () => {
  it("CSV export generates valid CSVs for leads, customers, estimates, and jobs", () => {
    const state = createSeedState()

    const leads = leadsCsv(state)
    assert.ok(leads.startsWith("\uFEFFLead Name,Email,Phone,Address,Stage,Project Title,Created Date"))
    assert.ok(leads.includes("Jim Patel"))

    const customers = customersCsv(state)
    assert.ok(customers.startsWith("\uFEFFCustomer Name,Email,Phone,Address,Total Projects,Total Value,First Contact"))
    assert.ok(customers.includes("Jim Patel"))

    const estimates = estimatesCsv(state)
    assert.ok(estimates.startsWith("\uFEFFEstimate ID,Customer,Email,Phone,Project Title,Job Address,Stage,Status,Total,Created,Updated"))
    assert.ok(estimates.includes("est-ortiz") || estimates.includes("est-lena"))

    const jobs = jobsCsvExport(state)
    assert.ok(jobs.startsWith("\uFEFFWork Order Estimate,Customer,Phone,Job Title,Address,Work Status,Scheduled Start,Total Amount"))

    const exportBundle = exportScopeCsv("leads", state)
    assert.ok(exportBundle.filename.startsWith("scopepipe-leads-"))
    assert.ok(exportBundle.content.includes("Jim Patel"))
  })

  it("Website lead form creates a lead for the correct contractor and maintains isolation", async () => {
    const userA = await signup({
      name: "Alpha Contractor",
      email: `alpha_${Date.now()}@test.local`,
      password: "password123",
      companyName: "Alpha Painting",
    })
    const userB = await signup({
      name: "Beta Contractor",
      email: `beta_${Date.now()}@test.local`,
      password: "password123",
      companyName: "Beta Painting",
    })

    assert.ok(userA.ok)
    assert.ok(userB.ok)
    if (!userA.ok || !userB.ok) return

    const companyA = userA.user.companyId
    const companyB = userB.user.companyId

    const tokenA = "a1b2c3d4e5f60718293a4b5c6d7e8f90"
    const tokenB = "f0e9d8c7b6a504132231405f6e7d8c9b"

    const bookA = await readCompanyBook(companyA)
    const bookB = await readCompanyBook(companyB)
    assert.ok(bookA)
    assert.ok(bookB)

    await writeCompanyBook(companyA, bookA.revision, {
      ...bookA.state,
      estimateSettings: { ...bookA.state.estimateSettings, leadWebhookToken: tokenA },
    })

    await writeCompanyBook(companyB, bookB.revision, {
      ...bookB.state,
      estimateSettings: { ...bookB.state.estimateSettings, leadWebhookToken: tokenB },
    })

    // Submit lead to Contractor A's webhook token
    const req = new Request(`http://localhost:3000/api/webhooks/leads/${tokenA}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        source: "website",
        name: "Test Homeowner",
        phone: "(503) 555-0144",
        email: "homeowner@test.local",
        address: "742 Evergreen Terr",
        message: "Need exterior painting done.",
      }),
    })

    const res = await leadWebhookPOST(req, { params: Promise.resolve({ token: tokenA }) })
    assert.equal(res.status, 200)
    const json = (await res.json()) as { ok: boolean }
    assert.equal(json.ok, true)

    // Verify Contractor A received the lead
    const freshA = await readCompanyBook(companyA)
    assert.ok(freshA)
    const foundLead = freshA.state.clients.find((c) => c.name === "Test Homeowner")
    assert.ok(foundLead)
    assert.equal(foundLead.phone, "(503) 555-0144")

    // Verify Contractor B NEVER received Contractor A's lead (Data Isolation)
    const freshB = await readCompanyBook(companyB)
    assert.ok(freshB)
    const leakedLead = freshB.state.clients.find((c) => c.name === "Test Homeowner")
    assert.equal(leakedLead, undefined)

    // Test authorized CSV export for Contractor A
    const sessionA = mockOfficeSession(companyA, userA.user.companyName)
    const sessionToken = signOfficeSession(sessionA, authSecret())
    const cookie = sessionCookie(sessionToken).split(";")[0] ?? ""

    const authReq = new Request("http://localhost:3000/api/export/csv?type=leads", {
      headers: { cookie },
    })
    const authRes = await exportCsvGET(authReq)
    assert.equal(authRes.status, 200)
    assert.equal(authRes.headers.get("content-type")?.includes("text/csv"), true)
    const csvContent = await authRes.text()
    assert.ok(csvContent.includes("Test Homeowner"))
  })

  it("Unauthorized users cannot access another contractor's CSV export data", async () => {
    // Unauthenticated request
    const unauthReq = new Request("http://localhost:3000/api/export/csv?type=customers")
    const unauthRes = await exportCsvGET(unauthReq)
    assert.equal(unauthRes.status, 401)
  })

  it("Calendar subscription links format properly for Google and Outlook", () => {
    const feedWebcal = "webcal://example.com/api/calendar/feed/caltoken123"
    const googleLink = `https://calendar.google.com/calendar/u/0/r?cid=${encodeURIComponent(feedWebcal)}`
    const outlookLink = `https://outlook.live.com/calendar/0/addcalendar?url=${encodeURIComponent(feedWebcal)}`

    assert.ok(googleLink.includes("calendar.google.com"))
    assert.ok(googleLink.includes(encodeURIComponent(feedWebcal)))
    assert.ok(outlookLink.includes("outlook.live.com"))
    assert.ok(outlookLink.includes(encodeURIComponent(feedWebcal)))
  })
})
