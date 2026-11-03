import assert from "node:assert/strict"
import { createHmac } from "node:crypto"
import test from "node:test"
import { officeStatusFromPaddle, subscriptionGrantsAccess } from "./entitlement.ts"
import { customerMirror, handleVerifiedPaddleEvent, subscriptionMirror } from "./paddle-fulfillment.ts"
import { incomingIsCurrent } from "./paddle-mirror.ts"
import { verifyPaddleWebhook } from "./paddle-server.ts"

test("active and trialing grant access, including when a cancel is scheduled", () => {
  assert.equal(subscriptionGrantsAccess("active"), true)
  assert.equal(subscriptionGrantsAccess("trialing"), true)
  assert.equal(subscriptionGrantsAccess("canceled"), false)
  assert.equal(subscriptionGrantsAccess("paused"), false)
  assert.equal(subscriptionGrantsAccess("past_due"), false)
  const mirror = subscriptionMirror({
    id: "sub_01",
    status: "active",
    customerId: "ctm_01",
    createdAt: "2026-11-01T00:00:00Z",
    updatedAt: "2026-11-03T18:00:00Z",
    scheduledChange: { action: "cancel", effectiveAt: "2026-12-01T00:00:00Z" },
    items: [{ price: { id: "pri_01", productId: "pro_01" }, product: { id: "pro_01" } }],
  })
  assert.equal(mirror?.status, "active")
  assert.equal(mirror?.scheduledChangeAction, "cancel")
  assert.equal(subscriptionGrantsAccess(mirror?.status ?? ""), true)
  assert.equal(officeStatusFromPaddle("active"), "active")
  assert.equal(officeStatusFromPaddle("paused"), "canceled")
  assert.equal(officeStatusFromPaddle("past_due"), "canceled")
})

test("an older delivery does not replace a newer mirror row", () => {
  assert.equal(incomingIsCurrent("2026-11-03T18:00:00Z", "2026-11-03T17:00:00Z"), false)
  assert.equal(incomingIsCurrent("2026-11-03T18:00:00Z", "2026-11-03T18:00:00Z"), true)
  assert.equal(incomingIsCurrent(null, "2026-11-03T18:00:00Z"), true)
})

test("customer events require an email and other event types are ignored", async () => {
  assert.equal(customerMirror({ id: "ctm_01", email: "Ada@Hale.test", createdAt: "2026-11-01T00:00:00Z", updatedAt: "2026-11-03T18:00:00Z" })?.email, "ada@hale.test")
  const ignored = await handleVerifiedPaddleEvent({ eventType: "report.created", data: { id: "rep_01" } })
  assert.equal(ignored.ignored, true)
})

test("the Paddle SDK rejects a webhook whose signature does not match the signing secret", async () => {
  const raw = JSON.stringify({ event_type: "customer.created" })
  const ts = "1762188000"
  const digest = createHmac("sha256", "signing-secret").update(`${ts}:${raw}`).digest("hex")
  await assert.rejects(
    () => verifyPaddleWebhook(raw, `ts=${ts};h1=${digest}`, "other-secret", "live"),
    /signature/i,
  )
})