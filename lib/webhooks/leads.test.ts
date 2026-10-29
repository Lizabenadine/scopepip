import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { createSeedState } from "../data/seed.ts"
import { leadWebhookToken } from "./token.ts"
import { landWebhookLead, parseWebhookLead } from "./leads.ts"

const NOW = "2026-10-29T20:00:00.000Z"

describe("lead webhooks", () => {
  it("accepts a 32 character token and refuses a short one", () => {
    assert.equal(leadWebhookToken("a".repeat(32)), "a".repeat(32))
    assert.equal(leadWebhookToken("abc"), null)
    assert.equal(leadWebhookToken("https://hooks.zapier.com/a"), null)
  })

  it("maps a known source and keeps an unknown source as a webhook lead", () => {
    const yelp = parseWebhookLead(
      { name: "June Adler", phone: "(503) 555-0171", source: "Yelp", message: "Two bedrooms" },
      NOW,
    )
    assert.equal(yelp.ok, true)
    if (!yelp.ok) return
    assert.equal(yelp.lead.source, "yelp")
    assert.equal(yelp.lead.name, "June Adler")

    const other = parseWebhookLead(
      { first_name: "Omar", last_name: "Singh", email: "omar@example.test", source: "Jobber", address: { street: "9 Knott St", city: "Portland" } },
      NOW,
    )
    assert.equal(other.ok, true)
    if (!other.ok) return
    assert.equal(other.lead.source, "webhook")
    assert.equal(other.lead.address, "9 Knott St, Portland")
    assert.equal(other.lead.message, "Source: Jobber")
    assert.equal(parseWebhookLead({ name: "June Adler" }, NOW).ok, false)
  })

  it("opens one cold lead and ignores the same post a second time", () => {
    const parsed = parseWebhookLead({ id: "zap-1", name: "June Adler", email: "june@example.test", source: "thumbtack" }, NOW)
    assert.equal(parsed.ok, true)
    if (!parsed.ok) return
    const first = landWebhookLead(createSeedState(), parsed.lead, NOW)
    assert.equal(first.created, true)
    assert.equal(first.state.estimates.find((item) => item.inboundLeadId === "zap-1")?.leadSource, "thumbtack")
    assert.ok(first.state.estimates.find((item) => item.inboundLeadId === "zap-1")?.followUp)
    const second = landWebhookLead(first.state, parsed.lead, NOW)
    assert.equal(second.created, false)
    assert.equal(second.state.estimates.filter((item) => item.inboundLeadId === "zap-1").length, 1)
  })
})
