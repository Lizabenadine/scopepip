import assert from "node:assert/strict"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { describe, it } from "node:test"
import { clearPayout, paddleKeyMode, payoutStatus, readPayout, routingNumberValid, savePayout } from "./payouts.ts"

describe("subscriber payouts", () => {
  it("checks a US routing number", () => {
    assert.equal(routingNumberValid("021000021"), true)
    assert.equal(routingNumberValid("123456789"), false)
    assert.equal(routingNumberValid("02100002"), false)
  })

  it("keeps a live Paddle key with a live token", () => {
    assert.equal(paddleKeyMode("pdl_live_apikey_example"), "live")
    assert.equal(paddleKeyMode("pdl_sdbx_apikey_example"), "sandbox")
    assert.equal(paddleKeyMode("live_not_an_api_key"), null)
  })

  it("stores one account's keys and does not report another account as connected", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "scopepipe-payouts-"))
    const previous = process.env.PAYOUTS_DIR
    process.env.PAYOUTS_DIR = dir
    try {
      const saved = savePayout("90e035c8-688c-4231-918d-84c1fefea592", {
        stripeSecret: "sk_test_scopepipe_example",
        stripePublishable: "pk_test_scopepipe_example",
        bankName: "First Federal",
        accountHolder: "ScopePipe Painting",
        routingNumber: "021000021",
        accountNumber: "123456789",
      })
      assert.equal(saved.ok, true)
      if (!saved.ok) return
      assert.equal(saved.status.stripe, true)
      assert.equal(saved.status.bank, true)
      assert.equal(saved.status.accountLast4, "6789")
      assert.equal(JSON.stringify(saved.status).includes("123456789"), false)
      assert.equal(payoutStatus(readPayout("11111111-1111-1111-1111-111111111111")).stripe, false)
      assert.equal(savePayout("90e035c8-688c-4231-918d-84c1fefea592", { routingNumber: "123456789" }).ok, false)
      clearPayout("90e035c8-688c-4231-918d-84c1fefea592", "bank")
      assert.equal(readPayout("90e035c8-688c-4231-918d-84c1fefea592").accountNumber, "")
      assert.equal(payoutStatus(readPayout("90e035c8-688c-4231-918d-84c1fefea592")).stripe, true)
    } finally {
      if (previous === undefined) delete process.env.PAYOUTS_DIR
      else process.env.PAYOUTS_DIR = previous
      fs.rmSync(dir, { recursive: true, force: true })
    }
  })
})
