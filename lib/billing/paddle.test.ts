import assert from "node:assert/strict"
import { createHmac } from "node:crypto"
import { describe, it } from "node:test"
import { extraSeatCheckoutFromEnv, paddleCheckout, paddleCheckoutFromEnv } from "./paddle-checkout.ts"
import { paddleSignatureMatches, readPaddleEvent } from "./paddle.ts"

const NOW = Date.parse("2026-10-29T22:00:00.000Z")
const SECRET = "paddle-secret"

describe("Paddle subscription webhook", () => {
  it("accepts a signed subscription and ignores the rest", () => {
    const body = {
      event_type: "subscription.created",
      data: {
        id: "sub_01",
        status: "trialing",
        customer: { email: "Ada@Hale.test" },
        custom_data: { user_id: "auth-1", office_user_id: "office-1" },
      },
    }
    const raw = JSON.stringify(body)
    const header = sign(raw, NOW)
    assert.equal(paddleSignatureMatches(raw, header, SECRET, NOW), true)
    assert.equal(paddleSignatureMatches(raw, header, "other-secret", NOW), false)
    assert.equal(paddleSignatureMatches(raw, header, SECRET, NOW + 6 * 60 * 1000), false)
    assert.deepEqual(readPaddleEvent(body), {
      event: "subscription_created",
      status: "trialing",
      userId: "auth-1",
      officeUserId: "office-1",
      email: "ada@hale.test",
      subscriptionId: "sub_01",
    })
    assert.deepEqual(
      readPaddleEvent({
        alert_name: "subscription_updated",
        data: { id: "sub_01", status: "active", user_email: "ada@hale.test" },
      }),
      {
        event: "subscription_updated",
        status: "active",
        userId: "",
        officeUserId: "",
        email: "ada@hale.test",
        subscriptionId: "sub_01",
      },
    )
    assert.deepEqual(
      readPaddleEvent({
        event_type: "subscription.canceled",
        data: { id: "sub_01", status: "active", custom_data: { office_user_id: "office-1" } },
      }),
      {
        event: "subscription_cancelled",
        status: "canceled",
        userId: "",
        officeUserId: "office-1",
        email: "",
        subscriptionId: "sub_01",
      },
    )
    assert.deepEqual(readPaddleEvent({ event_type: "transaction.completed" }), { ignored: true })
    assert.deepEqual(readPaddleEvent({ event_type: "subscription.updated", data: { status: "paused" } }), {
      error: "The Paddle event has no account.",
    })
  })
})

describe("Paddle checkout", () => {
  it("attaches the office account to a live price", () => {
    const checkout = paddleCheckout({
      token: "live_a1b2c3d4e5",
      priceId: "pri_01hfounding49",
      email: "Ada@Hale.test",
      userId: "office-1",
      authUserId: "auth-1",
    })
    assert.deepEqual(checkout, {
      token: "live_a1b2c3d4e5",
      priceId: "pri_01hfounding49",
      email: "Ada@Hale.test",
      userId: "auth-1",
      officeUserId: "office-1",
    })
    assert.equal(paddleCheckout({ token: "pdl_ntfset_secret", priceId: "pri_01hfounding49", email: "ada@hale.test", userId: "office-1" }), null)
    assert.equal(paddleCheckout({ token: "live_a1b2c3d4e5", priceId: "price_49", email: "ada@hale.test", userId: "office-1" }), null)
    assert.equal(paddleCheckout({ token: "live_a1b2c3d4e5", priceId: "pri_01hfounding49", email: "ada", userId: "office-1" }), null)
  })

  it("reads the client token and price from the environment", () => {
    const checkout = paddleCheckoutFromEnv(
      { email: "ada@hale.test", userId: "office-1" },
      { PADDLE_CLIENT_TOKEN: "test_a1b2c3d4e5", PADDLE_PRICE_ID: "pri_01hfounding49" },
    )
    assert.equal(checkout?.token, "test_a1b2c3d4e5")
    assert.equal(checkout?.officeUserId, "office-1")
    assert.equal(paddleCheckoutFromEnv({ email: "ada@hale.test", userId: "office-1" }, {}), null)
    const fromPublicName = paddleCheckoutFromEnv(
      { email: "ada@hale.test", userId: "office-1" },
      { NEXT_PUBLIC_PADDLE_CLIENT_TOKEN: "live_a1b2c3d4e5", PADDLE_PRICE_ID: "pri_01hfounding49" },
    )
    assert.equal(fromPublicName?.token, "live_a1b2c3d4e5")
  })

  it("selects correct plan tier prices and avoids $49 fallback for Starter or Business", () => {
    const fullEnv = {
      PADDLE_CLIENT_TOKEN: "live_testtoken123",
      PADDLE_PRICE_ID: "pri_prodefault49",
      PADDLE_PRICE_STARTER_MONTH: "pri_startermonth29",
      PADDLE_PRICE_STARTER_YEAR: "pri_starteryear290",
      PADDLE_PRICE_PRO_MONTH: "pri_promonth49",
      PADDLE_PRICE_PRO_YEAR: "pri_proyear490",
      PADDLE_PRICE_BUSINESS_MONTH: "pri_bizmonth79",
      PADDLE_PRICE_BUSINESS_YEAR: "pri_bizyear790",
      PADDLE_PRICE_EXTRA_SEAT_MONTH: "pri_extraseat10",
    }

    const starterMo = paddleCheckoutFromEnv({ email: "user@test.com", userId: "u1", planTier: "starter" }, fullEnv)
    assert.equal(starterMo?.priceId, "pri_startermonth29")

    const starterYr = paddleCheckoutFromEnv({ email: "user@test.com", userId: "u1", planTier: "starter", interval: "year" }, fullEnv)
    assert.equal(starterYr?.priceId, "pri_starteryear290")

    const bizMo = paddleCheckoutFromEnv({ email: "user@test.com", userId: "u1", planTier: "business" }, fullEnv)
    assert.equal(bizMo?.priceId, "pri_bizmonth79")

    const bizYr = paddleCheckoutFromEnv({ email: "user@test.com", userId: "u1", planTier: "business", interval: "year" }, fullEnv)
    assert.equal(bizYr?.priceId, "pri_bizyear790")

    const proMo = paddleCheckoutFromEnv({ email: "user@test.com", userId: "u1", planTier: "pro" }, fullEnv)
    assert.equal(proMo?.priceId, "pri_promonth49")

    // Missing Starter price must NOT fall back to $49 Pro default
    const missingStarterEnv = {
      PADDLE_CLIENT_TOKEN: "live_testtoken123",
      PADDLE_PRICE_ID: "pri_prodefault49",
    }
    const failedStarter = paddleCheckoutFromEnv({ email: "user@test.com", userId: "u1", planTier: "starter" }, missingStarterEnv)
    assert.equal(failedStarter, null)

    // Extra seat checkout helper
    const extraSeat = extraSeatCheckoutFromEnv({ email: "user@test.com", userId: "u1", quantity: 2 }, fullEnv)
    assert.equal(extraSeat?.priceId, "pri_extraseat10")
    assert.equal(extraSeat?.quantity, 2)
  })
})

function sign(raw: string, nowMs: number): string {
  const ts = String(Math.floor(nowMs / 1000))
  const digest = createHmac("sha256", SECRET).update(`${ts}:${raw}`).digest("hex")
  return `ts=${ts};h1=${digest}`
}
