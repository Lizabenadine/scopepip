import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  createPasswordResetToken,
  verifyPasswordResetToken,
} from "./password-reset-store.ts"

describe("password reset store", () => {
  it("creates and verifies a tamper-proof reset token", () => {
    const email = "contractor@example.com"
    const token = createPasswordResetToken(email)
    assert.equal(typeof token, "string")
    assert.equal(token.includes("."), true)

    // Verification succeeds
    const verified = verifyPasswordResetToken(token)
    assert.equal(verified.valid, true)
    assert.equal(verified.email, email)

    // Verification with embedded accessToken succeeds
    const tokenWithAccess = createPasswordResetToken(email, "sb-access-token-123")
    const verifiedWithAccess = verifyPasswordResetToken(tokenWithAccess)
    assert.equal(verifiedWithAccess.valid, true)
    assert.equal(verifiedWithAccess.email, email)
    assert.equal(verifiedWithAccess.accessToken, "sb-access-token-123")

    // Tampered token fails
    const tampered = `${token}x`
    const tamperedResult = verifyPasswordResetToken(tampered)
    assert.equal(tamperedResult.valid, false)
  })

  it("rejects unknown or invalid tokens", () => {
    const result = verifyPasswordResetToken("unknown-token-123")
    assert.equal(result.valid, false)
  })
})
