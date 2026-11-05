"use client"

import Link from "next/link"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("")
  const [pending, setPending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPending(true)
    setError(null)
    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email }),
      })
      const result = (await response.json()) as { ok?: boolean; reason?: string }
      if (!result.ok) {
        setError(result.reason || "That request did not go through.")
        return
      }
      setSent(true)
    } catch {
      setError("That request did not go through.")
    } finally {
      setPending(false)
    }
  }

  if (sent) {
    return (
      <div className="mx-auto grid w-full max-w-md gap-6">
        <div className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h1 className="text-2xl font-semibold tracking-tight">Check your email</h1>
          <p className="text-sm text-muted-foreground">
            If that email has an account, a password reset link is on its way. Open it in this
            browser to set a new password.
          </p>
          <Link href="/login" className="text-sm font-medium text-primary">
            Back to sign in
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto grid w-full max-w-md gap-6">
      <form
        onSubmit={submit}
        className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
        data-testid="forgot-password-form"
      >
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Forgot password</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Enter the email on your account and we will send a reset link.
          </p>
        </div>
        <div>
          <Label htmlFor="forgot-email">Email</Label>
          <Input
            id="forgot-email"
            data-testid="forgot-email"
            type="email"
            required
            value={email}
            onValueChange={setEmail}
            autoComplete="email"
          />
        </div>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <Button type="submit" className="h-11" disabled={pending} data-testid="forgot-submit">
          {pending ? "Sending" : "Send reset link"}
        </Button>
        <Link href="/login" className="text-sm font-medium text-primary">
          Back to sign in
        </Link>
      </form>
    </div>
  )
}
