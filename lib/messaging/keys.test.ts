import assert from "node:assert/strict"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { describe, it } from "node:test"
import { clearSendKeys, readSendKeys, saveSendKeys, sendKeyStatus } from "./keys.ts"

describe("send keys", () => {
  it("uses a saved Resend key when the environment is empty and hides the secret", () => {
    const file = path.join(os.tmpdir(), `scopepipe-send-keys-${process.pid}.json`)
    const previous = process.env.SEND_KEYS_PATH
    const resend = process.env.RESEND_API_KEY
    const from = process.env.FOLLOW_UP_FROM_EMAIL
    const stripe = process.env.STRIPE_SECRET_KEY
    const cron = process.env.CRON_SECRET
    process.env.SEND_KEYS_PATH = file
    delete process.env.RESEND_API_KEY
    delete process.env.FOLLOW_UP_FROM_EMAIL
    delete process.env.STRIPE_SECRET_KEY
    delete process.env.CRON_SECRET
    try {
      assert.equal(saveSendKeys({ resendKey: "short" }).ok, false)
      assert.equal(saveSendKeys({ resendKey: "re_test_key", resendFrom: "office@pb.test" }).ok, true)
      const keys = readSendKeys()
      assert.equal(keys.resendKey, "re_test_key")
      assert.equal(keys.resendFrom, "office@pb.test")
      const status = sendKeyStatus()
      assert.equal(status.email, true)
      assert.equal(status.emailFrom, "office@pb.test")
      assert.equal(JSON.stringify(status).includes("re_test_key"), false)
      clearSendKeys("resend")
      assert.equal(readSendKeys().resendKey, "")
      assert.equal(saveSendKeys({ stripeSecret: "not-a-stripe-key" }).ok, false)
      assert.equal(
        saveSendKeys({
          stripeSecret: "sk_test_scopepipe_example",
          stripePublishable: "pk_test_scopepipe_example",
          stripeWebhookSecret: "whsec_scopepipe_example",
          cronSecret: "daily-check-secret",
        }).ok,
        true,
      )
      const ready = sendKeyStatus()
      assert.equal(ready.stripe, true)
      assert.equal(ready.cron, true)
      assert.equal(JSON.stringify(ready).includes("sk_test"), false)
      assert.equal(JSON.stringify(ready).includes("daily-check"), false)
      process.env.STRIPE_SECRET_KEY = "sk_live_from_the_host"
      assert.equal(readSendKeys().stripeSecret, "sk_live_from_the_host")
      clearSendKeys("stripe")
      clearSendKeys("cron")
      assert.equal(readSendKeys().stripePublishable, "")
      assert.equal(readSendKeys().cronSecret, "")
    } finally {
      if (previous === undefined) delete process.env.SEND_KEYS_PATH
      else process.env.SEND_KEYS_PATH = previous
      if (resend === undefined) delete process.env.RESEND_API_KEY
      else process.env.RESEND_API_KEY = resend
      if (from === undefined) delete process.env.FOLLOW_UP_FROM_EMAIL
      else process.env.FOLLOW_UP_FROM_EMAIL = from
      if (stripe === undefined) delete process.env.STRIPE_SECRET_KEY
      else process.env.STRIPE_SECRET_KEY = stripe
      if (cron === undefined) delete process.env.CRON_SECRET
      else process.env.CRON_SECRET = cron
      fs.rmSync(file, { force: true })
    }
  })
})
