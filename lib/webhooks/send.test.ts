import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { selectWebhookUrls, sendWebhook, type WebhookSubscription } from "./send.ts"

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
})
