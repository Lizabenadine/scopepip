import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { interpretForgotPassword } from "./forgot-password-auth.ts"

describe("forgot-password auth", () => {
  it("detects when auth is unconfigured", () => {
    assert.deepEqual(
      interpretForgotPassword({ configured: false, error: null }),
      { kind: "unconfigured" },
    )
  })

  it("returns success when Supabase sends the email", () => {
    assert.deepEqual(
      interpretForgotPassword({ configured: true, error: null }),
      { kind: "success" },
    )
  })

  it("keeps account existence private when user is not found", () => {
    assert.deepEqual(
      interpretForgotPassword({
        configured: true,
        error: { message: "User not found", code: "user_not_found", status: 400 },
      }),
      { kind: "success" },
    )
  })

  it("surfaces rate limiting clearly", () => {
    const outcome = interpretForgotPassword({
      configured: true,
      error: { message: "Email rate limit exceeded", status: 429 },
    })
    assert.equal(outcome.kind, "rate_limit")
    if (outcome.kind === "rate_limit") {
      assert.match(outcome.reason, /wait a minute/i)
    }
  })

  it("surfaces email delivery / SMTP errors without leaking user existence", () => {
    const outcome = interpretForgotPassword({
      configured: true,
      error: { message: "Error sending recovery email", status: 500 },
    })
    assert.equal(outcome.kind, "error")
    if (outcome.kind === "error") {
      assert.match(outcome.reason, /could not send the reset email/i)
    }
  })
})
