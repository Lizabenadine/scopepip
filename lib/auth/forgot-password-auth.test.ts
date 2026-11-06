import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  canonicalResetPasswordUrl,
  interpretForgotPassword,
  isRecoveryHashOrQuery,
  recoveryRedirectUrl,
} from "./forgot-password-auth.ts"

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

  it("builds the correct recovery redirectTo URL for production and development", () => {
    // Production www and apex both target https://scopepipe.com/reset-password to match Supabase Site URL
    assert.equal(
      recoveryRedirectUrl("www.scopepipe.com", "https://www.scopepipe.com"),
      "https://scopepipe.com/reset-password",
    )
    assert.equal(
      recoveryRedirectUrl("scopepipe.com", "https://scopepipe.com"),
      "https://scopepipe.com/reset-password",
    )

    // Localhost uses local origin
    assert.equal(
      recoveryRedirectUrl("localhost:3000", "http://localhost:3000"),
      "http://localhost:3000/reset-password",
    )
    assert.equal(
      recoveryRedirectUrl("127.0.0.1:3000", "http://127.0.0.1:3000"),
      "http://127.0.0.1:3000/reset-password",
    )
  })

  it("detects recovery hash fragments and errors accurately", () => {
    // Recovery hash with tokens
    assert.equal(
      isRecoveryHashOrQuery({ hash: "#access_token=token&refresh_token=refresh&type=recovery" }),
      true,
    )
    // Error hash from expired/pre-fetched links
    assert.equal(
      isRecoveryHashOrQuery({ hash: "#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid" }),
      true,
    )
    // Recovery query params
    assert.equal(
      isRecoveryHashOrQuery({ search: "?type=recovery&code=abc" }),
      true,
    )
    assert.equal(
      isRecoveryHashOrQuery({ search: "?next=/reset-password&code=abc" }),
      true,
    )
    // Unrelated hash or query
    assert.equal(isRecoveryHashOrQuery({ hash: "#features", search: "?utm_source=google" }), false)
    assert.equal(isRecoveryHashOrQuery({ hash: "", search: "" }), false)
  })

  it("normalizes reset-password destination to canonical www domain", () => {
    assert.equal(
      canonicalResetPasswordUrl("https://scopepipe.com/auth/callback").href,
      "https://www.scopepipe.com/reset-password",
    )
    assert.equal(
      canonicalResetPasswordUrl("https://www.scopepipe.com/auth/callback").href,
      "https://www.scopepipe.com/reset-password",
    )
    assert.equal(
      canonicalResetPasswordUrl("http://localhost:3000/auth/callback").href,
      "http://localhost:3000/reset-password",
    )
  })
})
