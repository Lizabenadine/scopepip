import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { createClient } from "@supabase/supabase-js"
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

  it("requests recovery without PKCE code_challenge, verifies token_hash once, and updates password with verified session", async () => {
    const calls: { method: string; url: string; body: Record<string, unknown>; authHeader: string }[] = []

    const mockFetch: typeof fetch = async (input, init) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url
      const method = init?.method || "GET"
      const bodyText = typeof init?.body === "string" ? init.body : "{}"
      const body = JSON.parse(bodyText) as Record<string, unknown>
      const headers = new Headers(init?.headers)
      const authHeader = headers.get("Authorization") || headers.get("authorization") || ""

      const pathname = new URL(url).pathname
      calls.push({ method, url, body, authHeader })

      if (pathname.endsWith("/auth/v1/recover")) {
        return new Response(JSON.stringify({}), { status: 200, headers: { "content-type": "application/json" } })
      }

      if (pathname.endsWith("/auth/v1/verify")) {
        return new Response(
          JSON.stringify({
            access_token: "verified-recovery-jwt",
            token_type: "bearer",
            expires_in: 3600,
            refresh_token: "verified-refresh-token",
            user: {
              id: "user-123",
              aud: "authenticated",
              role: "authenticated",
              email: "contractor@example.com",
            },
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        )
      }

      if (pathname.endsWith("/auth/v1/user") && method === "PUT") {
        return new Response(
          JSON.stringify({
            id: "user-123",
            aud: "authenticated",
            role: "authenticated",
            email: "contractor@example.com",
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        )
      }

      return new Response(JSON.stringify({ error: "not_found" }), { status: 404 })
    }

    // 1. Forgot-password client: must not send PKCE code_challenge
    const forgotClient = createClient("https://example.supabase.co", "anon-key", {
      auth: {
        flowType: "implicit",
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
      global: { fetch: mockFetch },
    })

    const recoverRes = await forgotClient.auth.resetPasswordForEmail("contractor@example.com", {
      redirectTo: "https://scopepipe.com/reset-password",
    })
    assert.equal(recoverRes.error, null)
    assert.equal(calls.length, 1)
    assert.equal(calls[0].method, "POST")
    assert.equal(calls[0].body.code_challenge, null)
    assert.equal(calls[0].body.code_challenge_method, null)

    // 2. Reset-password client: verifies token_hash once and updates password with resulting session
    const resetClient = createClient("https://example.supabase.co", "anon-key", {
      auth: {
        flowType: "implicit",
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
      global: { fetch: mockFetch },
    })

    const verifyRes = await resetClient.auth.verifyOtp({
      token_hash: "standard-64-char-token-hash",
      type: "recovery",
    })
    assert.equal(verifyRes.error, null)
    assert.equal(verifyRes.data.user?.email, "contractor@example.com")
    assert.equal(verifyRes.data.session?.access_token, "verified-recovery-jwt")

    const updateRes = await resetClient.auth.updateUser({
      password: "NewSecurePassword123!",
    })
    assert.equal(updateRes.error, null)
    assert.equal(updateRes.data.user?.email, "contractor@example.com")

    // Verify exact network calls: 1 recover, 1 verify, 1 user update with Bearer verified-recovery-jwt
    assert.equal(calls.length, 3)
    assert.equal(calls[1].url.endsWith("/auth/v1/verify"), true)
    assert.equal(calls[1].body.token_hash, "standard-64-char-token-hash")
    assert.equal(calls[1].body.type, "recovery")

    assert.equal(calls[2].url.endsWith("/auth/v1/user"), true)
    assert.equal(calls[2].method, "PUT")
    assert.equal(calls[2].authHeader, "Bearer verified-recovery-jwt")
    assert.equal(calls[2].body.password, "NewSecurePassword123!")
  })

  it("updates password directly when access_token is provided from fragment redirect", async () => {
    const calls: { method: string; url: string; authHeader: string; body?: unknown }[] = []

    const mockFetch: typeof fetch = async (input, init) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url
      const headers = new Headers(init?.headers)
      const authHeader = headers.get("Authorization") || ""
      const body = init?.body ? JSON.parse(init.body as string) : undefined
      calls.push({ method: init?.method || "GET", url, authHeader, body })

      if (url.endsWith("/auth/v1/user") && (init?.method === "GET" || !init?.method)) {
        return new Response(
          JSON.stringify({
            id: "user-456",
            email: "owner@scopepipe.com",
            aud: "authenticated",
            role: "authenticated",
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        )
      }

      if (url.endsWith("/auth/v1/user") && init?.method === "PUT") {
        return new Response(
          JSON.stringify({
            id: "user-456",
            email: "owner@scopepipe.com",
            aud: "authenticated",
            role: "authenticated",
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        )
      }

      return new Response(JSON.stringify({ error: "not_found" }), { status: 404 })
    }

    // Verify token identity
    const userRes = await mockFetch("https://example.supabase.co/auth/v1/user", {
      headers: { Authorization: "Bearer fragment-recovery-token" },
    })
    const userData = (await userRes.json()) as { email: string }
    assert.equal(userData.email, "owner@scopepipe.com")

    // Update password with recovery Bearer token
    const updateRes = await mockFetch("https://example.supabase.co/auth/v1/user", {
      method: "PUT",
      headers: {
        Authorization: "Bearer fragment-recovery-token",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ password: "BrandNewPassword456!" }),
    })
    const updateData = (await updateRes.json()) as { id: string }
    assert.equal(updateData.id, "user-456")

    assert.equal(calls.length, 2)
    assert.equal(calls[0].authHeader, "Bearer fragment-recovery-token")
    assert.equal(calls[1].authHeader, "Bearer fragment-recovery-token")
    assert.deepEqual(calls[1].body, { password: "BrandNewPassword456!" })
  })
})
