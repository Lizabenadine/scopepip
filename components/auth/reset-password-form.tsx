"use client"

import { useState } from "react"
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
      const supabase = createBrowserClient(supabaseBrowserUrl(), supabasePublishableKey())
      const { error: updateError } = await supabase.auth.updateUser({ password })
      if (updateError) {
        setError(updateError.message || "The password could not be updated.")
        return
      }
      window.location.assign("/login?confirmed=1")
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
