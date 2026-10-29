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
    process.env.SEND_KEYS_PATH = file
    delete process.env.RESEND_API_KEY
    delete process.env.FOLLOW_UP_FROM_EMAIL
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
    } finally {
      if (previous === undefined) delete process.env.SEND_KEYS_PATH
      else process.env.SEND_KEYS_PATH = previous
      if (resend === undefined) delete process.env.RESEND_API_KEY
      else process.env.RESEND_API_KEY = resend
      if (from === undefined) delete process.env.FOLLOW_UP_FROM_EMAIL
      else process.env.FOLLOW_UP_FROM_EMAIL = from
      fs.rmSync(file, { force: true })
    }
  })
})
