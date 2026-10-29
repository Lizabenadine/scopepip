import assert from "node:assert/strict"
import { createHmac } from "node:crypto"
import { describe, it } from "node:test"
import { guardedPath, subscriptionAllows, trialEndsAt } from "./access.ts"
import { lemonCheckoutUrl } from "./checkout.ts"
import { billingSignatureMatches, readBillingEvent } from "./webhook.ts"

const NOW = Date.parse("2026-10-29T22:00:00.000Z")

describe("subscription access", () => {
  it("keeps a 14-day trial and an active subscription on the estimator and dashboard", () => {
    const ends = trialEndsAt(new Date(NOW))
    assert.equal(Date.parse(ends) - NOW, 14 * 24 * 60 * 60 * 1000)
    assert.equal(subscriptionAllows({ status: "trialing", trialEndsAt: ends }, NOW), true)
    assert.equal(subscriptionAllows({ status: "trialing", trialEndsAt: new Date(NOW - 1000).toISOString() }, NOW), false)
    assert.equal(subscriptionAllows({ status: "active", trialEndsAt: new Date(NOW - 1000).toISOString() }, NOW), true)
    assert.equal(subscriptionAllows({ status: "canceled", trialEndsAt: ends }, NOW), false)
    assert.equal(guardedPath("/dashboard"), true)
    assert.equal(guardedPath("/"), false)
    assert.equal(guardedPath("/estimate/new"), true)
    assert.equal(guardedPath("/estimates/est-lena"), true)
    assert.equal(guardedPath("/billing"), false)
    assert.equal(guardedPath("/work-orders/est-lena"), false)
    assert.equal(guardedPath("/p/695aebe9bdcd"), false)
  })

  it("builds a Lemon Squeezy overlay link for the office account", () => {
    const url = lemonCheckoutUrl("https://store.lemonsqueezy.com/checkout/buy/variant", {
      userId: "office-1",
      email: "ada@hale.test",
      authUserId: "auth-1",
    })
    assert.ok(url)
    assert.match(url!, /^https:\/\/store\.lemonsqueezy\.com\/checkout\/buy\/variant\?/)
    assert.match(url!, /checkout\[email\]=ada%40hale\.test/)
    assert.match(url!, /checkout\[custom\]\[user_id\]=auth-1/)
    assert.match(url!, /checkout\[custom\]\[office_user_id\]=office-1/)
    assert.equal(lemonCheckoutUrl("http://store.example/buy", { userId: "office-1", email: "ada@hale.test" }), null)
  })

  it("accepts a signed subscription event and ignores the rest", () => {
    const body = {
      meta: {
        event_name: "subscription_created",
        custom_data: { user_id: "auth-1", office_user_id: "office-1" },
      },
      data: { attributes: { status: "on_trial", trial_ends_at: "2026-11-12T22:00:00.000Z", user_email: "Ada@Hale.test" } },
    }
    const raw = JSON.stringify(body)
    const signature = createHmac("sha256", "billing-secret").update(raw).digest("hex")
    assert.equal(billingSignatureMatches(raw, signature, "billing-secret"), true)
    assert.equal(billingSignatureMatches(raw, signature, "other-secret"), false)
    assert.deepEqual(readBillingEvent(body), {
      event: "subscription_created",
      status: "trialing",
      trialEndsAt: "2026-11-12T22:00:00.000Z",
      userId: "auth-1",
      officeUserId: "office-1",
      email: "ada@hale.test",
    })
    assert.deepEqual(
      readBillingEvent({
        meta: { event_name: "subscription_cancelled", custom_data: { office_user_id: "office-1" } },
        data: { attributes: { status: "cancelled", user_email: "ada@hale.test" } },
      }),
      {
        event: "subscription_cancelled",
        status: "canceled",
        trialEndsAt: null,
        userId: "",
        officeUserId: "office-1",
        email: "ada@hale.test",
      },
    )
    assert.deepEqual(
      readBillingEvent({
        meta: { event_name: "subscription_updated", custom_data: { user_id: "auth-1" } },
        data: { attributes: { status: "active", user_email: "ada@hale.test" } },
      }),
      {
        event: "subscription_updated",
        status: "active",
        trialEndsAt: null,
        userId: "auth-1",
        officeUserId: "",
        email: "ada@hale.test",
      },
    )
    assert.deepEqual(readBillingEvent({ meta: { event_name: "order_created" } }), { ignored: true })
  })
})
