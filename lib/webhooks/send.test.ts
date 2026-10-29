import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { readOutboundHooks } from "./hooks.ts"
import { bookHookUrls, selectWebhookUrls, sendWebhook, type WebhookSubscription } from "./send.ts"

const hooks: WebhookSubscription[] = [
  { company_id: "pb", event: "lead.created", url: "https://hooks.zapier.com/lead", active: true },
  { company_id: "pb", event: "*", url: "https://hooks.zapier.com/all", active: true },
  { company_id: "pb", event: "lead.created", url: "http://hooks.zapier.com/plain", active: true },
  { company_id: "pb", event: "lead.created", url: "https://hooks.zapier.com/paused", active: false },
  { company_id: "other", event: "lead.created", url: "https://hooks.zapier.com/other", active: true },
]

describe("sendWebhook", () => {
  it("keeps active https hooks for the event and the company", () => {
    assert.deepEqual(selectWebhookUrls(hooks, "lead.created", "pb"), [
      "https://hooks.zapier.com/lead",
      "https://hooks.zapier.com/all",
    ])
    assert.deepEqual(selectWebhookUrls(hooks, "quote.followed_up", "pb"), ["https://hooks.zapier.com/all"])
  })

  it("returns without posting when Supabase is not configured", async () => {
    await sendWebhook("lead.created", { name: "June Adler" }, "pb")
  })

  it("posts a saved hook for that event and skips a paused one", () => {
    const saved = readOutboundHooks([
      { id: "1", event: "proposal.signed", url: "https://hooks.zapier.com/signed", active: true },
      { id: "2", event: "proposal.signed", url: "http://hooks.zapier.com/plain", active: true },
      { id: "3", event: "job.completed", url: "https://hooks.zapier.com/done", active: false },
      { id: "4", event: "lead.created", url: "https://hooks.zapier.com/lead", active: true },
    ])
    assert.equal(saved.length, 3)
    assert.deepEqual(bookHookUrls(saved, "proposal.signed"), ["https://hooks.zapier.com/signed"])
    assert.deepEqual(bookHookUrls(saved, "job.completed"), [])
  })
})
