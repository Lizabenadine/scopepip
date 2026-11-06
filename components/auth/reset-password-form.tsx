"use client"

import { useEffect, useState } from "react"
import { createBrowserClient } from "@supabase/ssr"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { supabaseBrowserUrl, supabaseAuthConfigured, supabasePublishableKey } from "@/lib/supabase/env"

export function ResetPasswordForm() {
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [expired, setExpired] = useState(false)

  useEffect(() => {
    if (typeof window === "undefined") return

    // 1. Check URL hash for error details from Supabase (e.g. otp_expired, access_denied)
    const hash = window.location.hash
    if (hash) {
      const params = new URLSearchParams(hash.replace(/^#/, ""))
      const errorCode = params.get("error_code")
      const errorDesc = params.get("error_description")
      const errorType = params.get("error")
      if (errorCode || errorType) {
        setExpired(true)
        setError(errorDesc?.replace(/\+/g, " ") || "This password reset link has expired or has already been used.")
        return
      }
    }

    // 2. Check search parameters for error details
    const searchParams = new URLSearchParams(window.location.search)
    if (searchParams.get("error") || searchParams.get("error_code")) {
      setExpired(true)
      const desc = searchParams.get("error_description")
      setError(desc?.replace(/\+/g, " ") || "This password reset link is invalid or has expired.")
      return
    }

    // 3. If query has a token_hash, verify it in the background to establish the recovery session
    const tokenHash = searchParams.get("token_hash")
    if (tokenHash && supabaseAuthConfigured()) {
      try {
        const supabase = createBrowserClient(supabaseBrowserUrl(), supabasePublishableKey())
        supabase.auth.verifyOtp({ token_hash: tokenHash, type: "recovery" }).then(({ error: otpError }) => {
          if (otpError) {
            setExpired(true)
            setError(otpError.message || "This password reset link is invalid or has expired.")
          }
        }).catch(() => {})
      } catch {
        // ignore
      }
    }

    // 4. If query has a code, exchange it in the background to establish the recovery session
    const code = searchParams.get("code")
    if (code && supabaseAuthConfigured()) {
      try {
        const supabase = createBrowserClient(supabaseBrowserUrl(), supabasePublishableKey())
        supabase.auth.exchangeCodeForSession(code).then(({ error: codeError }) => {
          if (codeError) {
            // Check if already authenticated via cookies or hash before showing expired
            supabase.auth.getSession().then(({ data }) => {
              if (!data.session) {
                // If verifier is missing (e.g. reset requested server-side), do not block form render;
                // password submission will authenticate via server-side session cookies.
              }
            }).catch(() => {})
          }
        }).catch(() => {})
      } catch {
        // ignore
      }
    }

    // 5. Initialize Supabase browser client to parse recovery hash tokens immediately
    if (supabaseAuthConfigured()) {
      try {
        const supabase = createBrowserClient(supabaseBrowserUrl(), supabasePublishableKey())
        supabase.auth.getSession().catch(() => {})
      } catch {
        // ignore
      }
    }
  }, [])

  if (!supabaseAuthConfigured()) {
    return (
      <div className="mx-auto grid w-full max-w-md gap-6">
        <div className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h1 className="text-2xl font-semibold tracking-tight">Set new password</h1>
          <p className="text-sm text-muted-foreground">
            Password reset is not available on this instance. Sign in with your existing password.
          </p>
          <Link href="/login" className="text-sm font-medium text-primary">Back to sign in</Link>
        </div>
      </div>
    )
  }

  if (expired) {
    return (
      <div className="mx-auto grid w-full max-w-md gap-6">
        <div className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h1 className="text-2xl font-semibold tracking-tight">Reset link expired</h1>
          <p className="text-sm text-destructive">
            {error || "This password reset link is invalid or has expired."}
          </p>
          <p className="text-sm text-muted-foreground">
            For security, password reset links can only be used once and expire quickly.
          </p>
          <Link
            href="/forgot-password"
            className="inline-flex h-11 items-center justify-center rounded-lg bg-primary px-4 font-medium text-primary-foreground"
          >
            Request a new password reset
          </Link>
          <Link href="/login" className="text-center text-sm font-medium text-slate-500 hover:text-slate-900">
            Back to sign in
          </Link>
        </div>
      </div>
    )
  }

  if (success) {
    return (
      <div className="mx-auto grid w-full max-w-md gap-6">
        <div className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h1 className="text-2xl font-semibold tracking-tight">Password updated</h1>
          <p className="text-sm text-muted-foreground">
            Your password has been reset successfully. Redirecting you to sign in...
          </p>
          <Link
            href="/login?confirmed=1"
            className="inline-flex h-11 items-center justify-center rounded-lg bg-primary px-4 font-medium text-primary-foreground"
          >
            Sign in now
          </Link>
        </div>
      </div>
    )
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (password.length < 8) {
      setError("Use at least 8 characters.")
      return
    }
    if (password !== confirm) {
      setError("The passwords do not match.")
      return
    }
    setPending(true)
    setError(null)
    try {
      let clientUpdated = false
      if (supabaseAuthConfigured()) {
        try {
          const supabase = createBrowserClient(supabaseBrowserUrl(), supabasePublishableKey())
          const { error: updateError } = await supabase.auth.updateUser({ password })
          if (!updateError) {
            clientUpdated = true
          }
        } catch {
          // Continue to server-side update
        }
      }

      // Update password via server-side session cookies and sync Scopepipe directory
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ password }),
      })
      const payload = (await res.json().catch(() => null)) as { ok?: boolean; reason?: string } | null
      if (!clientUpdated && (!res.ok || !payload?.ok)) {
        setError(payload?.reason || "The password could not be updated. Please request a new reset link.")
        return
      }

      setSuccess(true)
      setTimeout(() => {
        window.location.assign("/login?confirmed=1")
      }, 1500)
    } catch {
      setError("The password could not be updated.")
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="mx-auto grid w-full max-w-md gap-6">
      <form
        onSubmit={submit}
        className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
        data-testid="reset-password-form"
      >
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Set new password</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Enter a new password for your account.
          </p>
        </div>
        <div>
          <Label htmlFor="reset-password">New password</Label>
          <Input
            id="reset-password"
            data-testid="reset-password"
            type="password"
            required
            value={password}
            onValueChange={setPassword}
            autoComplete="new-password"
          />
        </div>
        <div>
          <Label htmlFor="reset-confirm">Confirm new password</Label>
          <Input
            id="reset-confirm"
            data-testid="reset-confirm"
            type="password"
            required
            value={confirm}
            onValueChange={setConfirm}
            autoComplete="new-password"
          />
        </div>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <Button type="submit" className="h-11" disabled={pending} data-testid="reset-submit">
          {pending ? "Saving" : "Set password"}
        </Button>
        <Link href="/login" className="text-sm font-medium text-primary">Back to sign in</Link>
      </form>
    </div>
  )
}
