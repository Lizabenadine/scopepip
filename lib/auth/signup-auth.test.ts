import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { interpretSignUp } from "./signup-auth.ts"

describe("signup auth", () => {
  it("keeps the session when email confirmation is off", () => {
    assert.deepEqual(
      interpretSignUp({ configured: true, errorMessage: null, hasSession: true, hasUser: true, identityCount: 1 }),
      { kind: "session" },
    )
  })

  it("asks for the confirmation link when Supabase has not issued a session", () => {
    assert.deepEqual(
      interpretSignUp({ configured: true, errorMessage: null, hasSession: false, hasUser: true, identityCount: 1 }),
      { kind: "confirm" },
    )
  })

  it("explains a confirmation email limit in plain language", () => {
    assert.equal(
      interpretSignUp({
        configured: true,
        errorMessage: "email rate limit exceeded",
        hasSession: false,
        hasUser: false,
        identityCount: null,
      }).kind,
      "error",
    )
    const outcome = interpretSignUp({
      configured: true,
      errorMessage: "email rate limit exceeded",
      hasSession: false,
      hasUser: false,
      identityCount: null,
    })
    assert.equal(outcome.kind, "error")
    if (outcome.kind === "error") assert.match(outcome.reason, /Wait a minute/)
  })

  it("treats an empty identity list as an existing account", () => {
    assert.equal(
      interpretSignUp({
        configured: true,
        errorMessage: null,
        hasSession: false,
        hasUser: true,
        identityCount: 0,
      }).kind,
      "exists",
    )
  })
})
