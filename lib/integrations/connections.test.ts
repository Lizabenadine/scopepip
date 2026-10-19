import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { createSeedState } from "../data/seed.ts"
import { calendarEvents } from "../calendar/events.ts"
import { calendarIcs } from "../calendar/ics.ts"
import { companyCamJobs, matchCompanyCamProject, parseCompanyCamPhotos, parseCompanyCamProjects } from "../companycam/match.ts"
import { financingTerms, monthlyPayment } from "../financing/offer.ts"
import { pastCustomerEmail, pastCustomers } from "../outreach/past-customers.ts"
import { quickBooksInvoice } from "../quickbooks/invoice.ts"
import { pendingZapierEvents, zapierTarget } from "../zapier/events.ts"

describe("proposal financing", () => {
  it("estimates a monthly payment and hides a non-https apply link", () => {
    const terms = financingTerms({ financingApplyUrl: "http://example.com/apply", financingLender: "  " })
    assert.equal(terms.enabled, true)
    assert.equal(terms.aprPercent, 9.99)
    assert.equal(terms.months, 12)
    assert.equal(terms.applyUrl, "")
    assert.equal(monthlyPayment(10000, 9.99, 12), 879.11)
    assert.equal(monthlyPayment(1200, 0, 12), 100)
    assert.equal(financingTerms({ financingEnabled: false }).enabled, false)
    assert.equal(financingTerms({ financingApplyUrl: "https://lender.example/apply" }).applyUrl, "https://lender.example/apply")
  })
})

describe("past customers", () => {
  it("emails finished jobs and skips open leads", () => {
    const state = createSeedState()
    const rows = pastCustomers(state)
    assert.deepEqual(rows.map((row) => row.client.name), ["Jim Patel"])
    assert.equal(rows[0]?.email, "jim@patel.test")
    const message = pastCustomerEmail({ clientName: "Jim Patel", company: "ScopePipe", address: "410 Elm Street, Portland" })
    assert.equal(message.subject, "Another room to paint?")
    assert.equal(message.body.includes("410 Elm Street, Portland"), true)
    assert.equal(message.body.includes("$"), false)
  })
})

describe("google calendar feed", () => {
  it("lists a scheduled job and builds an all-day event", () => {
    const state = createSeedState()
    const events = calendarEvents(state)
    const lena = events.find((event) => event.uid === "job-est-lena")
    assert.equal(lena?.allDay, true)
    assert.equal(lena?.start, "2026-10-08")
    assert.equal(events.some((event) => event.uid === "job-est-maya"), false)
    const ics = calendarIcs(events, "2026-10-18T16:00:00.000Z")
    assert.equal(ics.includes("BEGIN:VCALENDAR"), true)
    assert.equal(ics.includes("DTSTART;VALUE=DATE:20261008"), true)
    assert.equal(ics.includes("DTEND;VALUE=DATE:20261009"), true)
  })
})

describe("quickbooks invoices", () => {
  it("builds a doc number from the estimate and drops a zero total", () => {
    const invoice = quickBooksInvoice({
      estimateId: "est-lena",
      customerName: "Lena Brooks",
      email: "lena.brooks@email.test",
      description: "Hall and stairs",
      amount: 1446.25,
    })
    assert.equal(invoice?.docNumber, "est-lena")
    assert.equal(invoice?.amount, 1446.25)
    assert.equal(quickBooksInvoice({ estimateId: "est-lena", customerName: "Lena", email: "", description: "", amount: 0 }), null)
  })
})

describe("zapier", () => {
  it("requires https and sends only events after the hook was saved", () => {
    assert.equal(zapierTarget("http://hooks.zapier.com/a"), null)
    assert.equal(zapierTarget("https://hooks.zapier.com/hooks/catch/1"), "https://hooks.zapier.com/hooks/catch/1")
    const state = createSeedState()
    state.estimateSettings = { ...state.estimateSettings, zapierWebhookUrl: "https://hooks.zapier.com/a", zapierSince: "2026-10-18T00:00:00.000Z" }
    const ortiz = state.estimates.find((estimate) => estimate.id === "est-ortiz")
    if (ortiz) ortiz.proposalOpens = [{ id: "open-1", at: "2026-10-18T16:00:00.000Z", kind: "open" }]
    const events = pendingZapierEvents(state)
    assert.deepEqual(events.map((event) => event.event), ["proposal.opened"])
    state.zapierDelivered = ["open:open-1"]
    assert.equal(pendingZapierEvents(state).length, 0)
  })
})

describe("companycam", () => {
  it("matches the street and ignores a stored link that is not a project", () => {
    const projects = parseCompanyCamProjects([
      {
        id: 99,
        name: "Birch house",
        address: { street_address_1: "1842 Birch Street", city: "Portland", state: "OR" },
        project_url: "https://app.companycam.com/projects/99",
      },
    ])
    assert.equal(matchCompanyCamProject({ address: "1842 Birch St, Portland", title: "Main floor" }, projects)?.id, "99")
    assert.equal(matchCompanyCamProject({ address: "410 Elm Street, Portland", title: "Exterior" }, projects), null)
    assert.equal(matchCompanyCamProject({ address: "Portland", title: "Downtown", projectId: "99" }, projects)?.projectUrl, "https://app.companycam.com/projects/99")
    const photos = parseCompanyCamPhotos({
      photos: [{ id: "55", uris: [{ type: "web", uri: "https://cdn.example/photo.jpg" }, { type: "original", uri: "http://insecure.example/a.jpg" }], captured_at: 1760000000 }],
    })
    assert.equal(photos.length, 1)
    assert.equal(photos[0]?.url, "https://cdn.example/photo.jpg")
    const jobs = companyCamJobs(createSeedState()).map((job) => job.estimateId)
    assert.equal(jobs.includes("est-rosa"), true)
    assert.equal(jobs.includes("est-maya"), false)
  })
})
