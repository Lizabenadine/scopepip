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
  const [isVerifying, setIsVerifying] = useState(true)
  const [isValidToken, setIsValidToken] = useState(false)

  useEffect(() => {
    async function handlePasswordReset() {
      if (typeof window === "undefined") {
        setIsVerifying(false)
        return
      }

      // 1. Check URL hash for error details from Supabase (e.g. otp_expired, access_denied)
      const hash = window.location.hash
      if (hash) {
        const params = new URLSearchParams(hash.replace(/^#/, ""))
        const errorCode = params.get("error_code")
        const errorDesc = params.get("error_description")
        const errorType = params.get("error")
        if (errorCode || errorType) {
          setError(errorDesc?.replace(/\+/g, " ") || "This password reset link has expired or has already been used.")
          setIsValidToken(false)
          setIsVerifying(false)
          return
        }
      }

      // 2. Check search parameters for error details
      const searchParams = new URLSearchParams(window.location.search)
      if (searchParams.get("error") || searchParams.get("error_code")) {
        const desc = searchParams.get("error_description")
        setError(desc?.replace(/\+/g, " ") || "This password reset link is invalid or has expired.")
        setIsValidToken(false)
        setIsVerifying(false)
        return
      }

      // 3. Give Supabase a moment to process the hash parameters from the email link
      if (hash && hash.includes("access_token")) {
        const params = new URLSearchParams(hash.replace(/^#/, ""))
        const at = params.get("access_token")
        const rt = params.get("refresh_token")
        if (at && supabaseAuthConfigured()) {
          try {
            const supabase = createBrowserClient(supabaseBrowserUrl(), supabasePublishableKey())
            await supabase.auth.setSession({ access_token: at, refresh_token: rt || "" }).catch(() => {})
          } catch {
            // ignore
          }
        }
        setIsValidToken(true)
        setIsVerifying(false)
        return
      }

      // 4. Check search query for token_hash
      const tokenHash = searchParams.get("token_hash")
      if (tokenHash) {
        if (supabaseAuthConfigured()) {
          try {
            const supabase = createBrowserClient(supabaseBrowserUrl(), supabasePublishableKey())
            const { error: otpError } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: "recovery" })
            if (otpError) {
              setError(otpError.message || "This password reset link is invalid or has expired.")
              setIsValidToken(false)
              setIsVerifying(false)
              return
            }
          } catch {
            // ignore
          }
        }
        setIsValidToken(true)
        setIsVerifying(false)
        return
      }

      // 5. Check search query for PKCE code
      const code = searchParams.get("code")
      if (code) {
        if (supabaseAuthConfigured()) {
          try {
            const supabase = createBrowserClient(supabaseBrowserUrl(), supabasePublishableKey())
            await supabase.auth.exchangeCodeForSession(code).catch(() => {})
          } catch {
            // ignore
          }
        }
        setIsValidToken(true)
        setIsVerifying(false)
        return
      }

      // 6. Fallback check for active session or code exchange
      if (supabaseAuthConfigured()) {
        try {
          const supabase = createBrowserClient(supabaseBrowserUrl(), supabasePublishableKey())
          const { data } = await supabase.auth.getSession()
          if (data?.session) {
            setIsValidToken(true)
            setIsVerifying(false)
            return
          }
        } catch {
          // ignore
        }
      }

      // Only show expired/invalid AFTER verification attempt finishes, not instantly
      setIsValidToken(false)
      setIsVerifying(false)
    }

    handlePasswordReset()
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

  if (isVerifying) {
    return (
      <div className="mx-auto grid w-full max-w-md gap-6">
        <div className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm text-center">
          <h1 className="text-xl font-semibold tracking-tight">Verifying reset session...</h1>
          <p className="text-sm text-muted-foreground">Please wait while we verify your password reset link.</p>
        </div>
      </div>
    )
  }

  if (!isValidToken) {
    return (
      <div className="mx-auto grid w-full max-w-md gap-6">
        <div className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h1 className="text-2xl font-semibold tracking-tight">Reset link expired or invalid</h1>
          <p className="text-sm text-muted-foreground">
            {error || "This password reset link has expired or has already been used. Please request a new link to reset your password."}
          </p>
          <Link
            href="/forgot-password"
            className="inline-flex h-11 items-center justify-center rounded-lg bg-primary px-4 font-medium text-primary-foreground"
          >
            Request a new password reset link
          </Link>
          <Link href="/login" className="text-center text-sm font-medium text-primary">Back to sign in</Link>
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
            Your password has been reset successfully. You can now sign in with your new password.
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
      let hashAccessToken = ""
      let hashRefreshToken = ""
      if (typeof window !== "undefined" && window.location.hash) {
        const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""))
        hashAccessToken = hashParams.get("access_token") || ""
        hashRefreshToken = hashParams.get("refresh_token") || ""
      }
      const searchParams = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null
      const tokenHash = searchParams?.get("token_hash") || ""

      let clientUpdated = false
      if (supabaseAuthConfigured()) {
        try {
          const supabase = createBrowserClient(supabaseBrowserUrl(), supabasePublishableKey())
          if (hashAccessToken) {
            await supabase.auth.setSession({
              access_token: hashAccessToken,
              refresh_token: hashRefreshToken || "",
            }).catch(() => {})
          } else if (tokenHash) {
            await supabase.auth.verifyOtp({ token_hash: tokenHash, type: "recovery" }).catch(() => {})
          }
          const { error: updateError } = await supabase.auth.updateUser({ password })
          if (!updateError) {
            clientUpdated = true
          }
        } catch {
          // Continue to server-side update
        }
      }

      // Update password via server-side session cookies / tokens and sync Scopepipe directory
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          password,
          accessToken: hashAccessToken || undefined,
          refreshToken: hashRefreshToken || undefined,
          tokenHash: tokenHash || undefined,
        }),
      })
      const payload = (await res.json().catch(() => null)) as { ok?: boolean; reason?: string } | null
      if (!clientUpdated && (!res.ok || !payload?.ok)) {
        setError(payload?.reason || "The password could not be updated. Please request a new reset link.")
        return
      }

      setSuccess(true)
      setTimeout(() => {
        window.location.assign("/login?confirmed=1")
      }, 30000)
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
        {error ? (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            <p>{error}</p>
            <Link href="/forgot-password" className="mt-1 inline-block text-xs font-medium underline">
              Request a new password reset link
            </Link>
          </div>
        ) : null}
        <Button type="submit" className="h-11" disabled={pending} data-testid="reset-submit">
          {pending ? "Saving" : "Set password"}
        </Button>
        <Link href="/login" className="text-sm font-medium text-primary">Back to sign in</Link>
      </form>
    </div>
  )
}
