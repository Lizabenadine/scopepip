import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  createPasswordResetToken,
  markResetTokenUsed,
  verifyPasswordResetToken,
} from "./password-reset-store.ts"

describe("password reset store", () => {
  it("creates, verifies, and consumes a reset token", async () => {
    const email = "contractor@example.com"
    const token = await createPasswordResetToken(email)
    assert.equal(typeof token, "string")
    assert.equal(token.length, 64)

    // Verification succeeds
    const verified = await verifyPasswordResetToken(token)
    assert.equal(verified.valid, true)
    assert.equal(verified.email, email)

    // Marking as used prevents reuse
    const marked = await markResetTokenUsed(token)
    assert.equal(marked, true)

    const recheck = await verifyPasswordResetToken(token)
    assert.equal(recheck.valid, false)
    assert.match(recheck.reason || "", /already been used/i)
  })

  it("rejects unknown or invalid tokens", async () => {
    const result = await verifyPasswordResetToken("unknown-token-123")
    assert.equal(result.valid, false)
    assert.match(result.reason || "", /invalid or has already been used/i)
  })
})
