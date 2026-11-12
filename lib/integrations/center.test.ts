import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { featuredIntegrations, latestTimestamp, type HostConnections } from "./center.ts"

const emptyHost: HostConnections = {
  companyCam: false,
  quickbooks: false,
  googleCalendar: false,
  facebookLeads: false,
}

const names = [
  "CompanyCam",
  "Zapier",
  "QuickBooks Online",
  "Google Calendar",
  "Gmail",
  "Google Business Profile",
  "Facebook and Instagram",
]

describe("featured integrations", () => {
  it("lists the seven services and leaves each one disconnected until a real connection exists", () => {
    const cards = featuredIntegrations({}, emptyHost)
    assert.deepEqual(cards.map((item) => item.name), names)
    const gmail = cards.find((item) => item.id === "gmail")
    assert.equal(gmail?.status, "unavailable")
    assert.equal(gmail?.action, "Configure")
    for (const item of cards) {
      if (item.id === "gmail") continue
      assert.equal(item.status, "disconnected", item.id)
      assert.equal(item.action, "Connect", item.id)
    }
  })

  it("marks a service connected only from its own saved connection", () => {
    const cards = featuredIntegrations(
      {
        reviewUrl: "https://g.page/r/scopepipe/review",
        zapierWebhookUrl: "https://hooks.zapier.com/hooks/catch/1",
        companyCamSyncedAt: "2026-10-02T15:00:00.000Z",
        quickbooksSyncedAt: "2026-10-04T18:30:00.000Z",
      },
      { companyCam: true, quickbooks: true, googleCalendar: true, facebookLeads: true },
    )
    const status = Object.fromEntries(cards.map((item) => [item.id, item.status]))
    assert.equal(status.companycam, "connected")
    assert.equal(status.zapier, "connected")
    assert.equal(status.quickbooks, "connected")
    assert.equal(status["google-calendar"], "connected")
    assert.equal(status.gmail, "unavailable")
    assert.equal(status["google-business"], "configured")
    assert.equal(status["facebook-instagram"], "connected")
    assert.equal(cards.find((item) => item.id === "companycam")?.action, "Manage")
    assert.equal(cards.find((item) => item.id === "companycam")?.lastSync, "2026-10-02T15:00:00.000Z")
    assert.equal(cards.find((item) => item.id === "gmail")?.lastSync, undefined)
    assert.equal(cards.find((item) => item.id === "quickbooks")?.href, "/settings?tab=payments")
  })

  it("does not treat an email key, an http hook, or a bare review link as a connection", () => {
    const cards = featuredIntegrations(
      { reviewUrl: "g.page/scopepipe", zapierWebhookUrl: "http://hooks.zapier.com/a" },
      emptyHost,
    )
    assert.equal(cards.find((item) => item.id === "gmail")?.status, "unavailable")
    assert.equal(cards.find((item) => item.id === "google-business")?.status, "disconnected")
    assert.equal(cards.find((item) => item.id === "zapier")?.status, "disconnected")
    assert.equal(cards.find((item) => item.id === "facebook-instagram")?.status, "disconnected")
  })

  it("waits to label a host integration until the status check returns", () => {
    const cards = featuredIntegrations({ zapierWebhookUrl: "https://hooks.zapier.com/a" }, null)
    assert.equal(cards.find((item) => item.id === "companycam")?.pending, true)
    assert.equal(cards.find((item) => item.id === "zapier")?.status, "connected")
    assert.equal(cards.find((item) => item.id === "zapier")?.pending, false)
    assert.equal(cards.find((item) => item.id === "gmail")?.pending, false)
  })

  it("keeps the newest successful sync", () => {
    assert.equal(
      latestTimestamp(["2026-10-01T00:00:00.000Z", "not-a-date", undefined, "2026-10-03T12:00:00.000Z"]),
      "2026-10-03T12:00:00.000Z",
    )
  })
})
