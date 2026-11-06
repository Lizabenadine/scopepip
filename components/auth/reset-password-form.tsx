"use client"

import { useSearchParams } from "next/navigation"
import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

function readHashAndStorageTokens(): { accessToken: string; refreshToken: string; hashError: string } {
  if (typeof window === "undefined") {
    return { accessToken: "", refreshToken: "", hashError: "" }
  }
  const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""))
  let accessToken = hashParams.get("access_token") || ""
  let refreshToken = hashParams.get("refresh_token") || ""
  const hashError = hashParams.get("error_description") || hashParams.get("error") || ""

  try {
    if (accessToken) {
      window.sessionStorage.setItem("scopepipe_recovery_access_token", accessToken)
    } else {
      accessToken = window.sessionStorage.getItem("scopepipe_recovery_access_token") || ""
    }
    if (refreshToken) {
      window.sessionStorage.setItem("scopepipe_recovery_refresh_token", refreshToken)
    } else {
      refreshToken = window.sessionStorage.getItem("scopepipe_recovery_refresh_token") || ""
    }
  } catch {
    // ignore storage errors
  }

  return { accessToken, refreshToken, hashError }
}

export function ResetPasswordForm() {
  const searchParams = useSearchParams()
  const token = searchParams.get("token") || ""
  const tokenHash = searchParams.get("token_hash") || ""
  const code = searchParams.get("code") || ""

  const capturedRef = useRef<{ accessToken: string; refreshToken: string }>({
    accessToken: "",
    refreshToken: "",
  })

  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    const { accessToken, refreshToken, hashError } = readHashAndStorageTokens()
    if (accessToken) capturedRef.current.accessToken = accessToken
    if (refreshToken) capturedRef.current.refreshToken = refreshToken

    const queryError = searchParams.get("error_description") || searchParams.get("error") || ""
    const hasAnyToken = Boolean(token || tokenHash || code || accessToken)
    if (!hasAnyToken && (hashError || queryError)) {
      setError((hashError || queryError).replace(/\+/g, " "))
    }
  }, [searchParams, token, tokenHash, code])

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

    const live = readHashAndStorageTokens()
    const accessToken = live.accessToken || capturedRef.current.accessToken
    const refreshToken = live.refreshToken || capturedRef.current.refreshToken

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          password,
          token,
          tokenHash,
          code,
          accessToken,
          refreshToken,
        }),
      })

      const payload = (await res.json().catch(() => null)) as { ok?: boolean; reason?: string } | null
      if (!res.ok || !payload?.ok) {
        setError(payload?.reason || "This password reset link is invalid or has expired.")
        return
      }

      try {
        window.sessionStorage.removeItem("scopepipe_recovery_access_token")
        window.sessionStorage.removeItem("scopepipe_recovery_refresh_token")
      } catch {
        // ignore
      }

      setSuccess(true)
      setTimeout(() => {
        window.location.assign("/login?confirmed=1")
      }, 30000)
    } catch {
      setError("The password could not be updated. Please try again.")
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
