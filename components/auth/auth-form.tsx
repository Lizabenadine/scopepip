"use client"

import Link from "next/link"
import { useState } from "react"
import { readBrowserLogin, saveBrowserBook, saveBrowserLogin } from "@/lib/auth/browser-book"
import { homeForRole, type UserRole } from "@/lib/auth/role"
import type { OfficeSession } from "@/lib/auth/session"
import { isScopeState } from "@/lib/data/seed"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export function AuthForm({ mode, banner = null }: { mode: "login" | "signup"; banner?: string | null }) {
  const signup = mode === "signup"
  const fieldClass = signup ? "h-auto w-full rounded-md border-slate-700 bg-slate-800 px-3 py-2 text-white" : "h-11"
  const labelClass = signup ? "block text-sm font-medium text-slate-300" : undefined
  const [name, setName] = useState("")
  const [companyName, setCompanyName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [role, setRole] = useState<UserRole>("owner")
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPending(true)
    setError(null)
    try {
      const remembered = signup ? null : readBrowserLogin(email)
      const response = await fetch(signup ? "/api/auth/signup" : "/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(
          signup
            ? { name, companyName, email, password }
            : { email, password, role, passwordHash: remembered?.passwordHash, hostedUser: remembered?.user },
        ),
      })
      const result = (await response.json()) as {
        ok?: boolean
        reason?: string
        passwordHash?: string
        revision?: number
        book?: unknown
        user?: OfficeSession
        confirmEmail?: boolean
      }
      if (signup && result.confirmEmail) {
        const address = email.trim()
        window.location.assign(`/verify-email?email=${encodeURIComponent(address)}`)
        return
      }
      if (!response.ok || !result.ok || !result.user) {
        setError(result.reason || (signup ? "That account could not be created." : "That sign-in did not work."))
        return
      }
      if (result.passwordHash) saveBrowserLogin(result.user, result.passwordHash)
      if (typeof result.revision === "number" && isScopeState(result.book)) {
        saveBrowserBook(result.user.companyId, result.revision, result.book)
      }
      window.location.assign(signup ? "/dashboard" : homeForRole(result.user.role))
    } catch {
      setError(signup ? "That account could not be created." : "That sign-in did not work.")
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="mx-auto grid w-full max-w-md gap-6">
      <form
        onSubmit={submit}
        className={
          signup
            ? "space-y-4 rounded-2xl border border-slate-700 bg-slate-950 p-5"
            : "grid gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
        }
        data-testid={signup ? "signup-form" : "login-form"}
      >
        <div>
          <h1 className={signup ? "text-2xl font-semibold tracking-tight text-white" : "text-2xl font-semibold tracking-tight"}>
            {signup ? "Create the company login" : "Sign in"}
          </h1>
          <p className={signup ? "mt-1 text-sm text-slate-400" : "mt-1 text-sm text-muted-foreground"}>
            {signup
              ? "You are the owner. The sample jobs are copied onto this login only. Another company cannot see them."
              : "Use the role on this login. The owner opens the office. A project manager opens the jobs, work orders, and invoices."}
          </p>
        </div>
        {banner ? <p className={signup ? "text-sm text-slate-200" : "text-sm text-foreground"}>{banner}</p> : null}
        {signup ? (
          <>
            <div className="grid gap-1">
              <Label htmlFor="signup-name" className={labelClass}>Your name</Label>
              <Input id="signup-name" data-testid="signup-name" value={name} onValueChange={setName} autoComplete="name" className={fieldClass} />
            </div>
            <div className="grid gap-1">
              <Label htmlFor="signup-company" className={labelClass}>Company name</Label>
              <Input id="signup-company" data-testid="signup-company" value={companyName} onValueChange={setCompanyName} autoComplete="organization" className={fieldClass} />
            </div>
          </>
        ) : (
          <fieldset className="grid gap-2">
            <legend className="text-sm font-medium">Role</legend>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="role"
                value="owner"
                data-testid="login-role-owner"
                checked={role === "owner"}
                onChange={() => setRole("owner")}
              />
              Owner
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="role"
                value="project_manager"
                data-testid="login-role-project-manager"
                checked={role === "project_manager"}
                onChange={() => setRole("project_manager")}
              />
              Project manager
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="role"
                value="estimator"
                data-testid="login-role-estimator"
                checked={role === "estimator"}
                onChange={() => setRole("estimator")}
              />
              Estimator
            </label>
          </fieldset>
        )}
        <div>
          <Label htmlFor="auth-email" className={labelClass}>
            Email
          </Label>
          <Input
            id="auth-email"
            name="email"
            data-testid={signup ? "signup-email" : "login-email"}
            type="email"
            required
            value={email}
            onValueChange={setEmail}
            autoComplete={signup ? "email" : "username"}
            className={fieldClass}
          />
        </div>
        <div>
          <Label htmlFor="auth-password" className={labelClass}>
            Password
          </Label>
          <Input
            id="auth-password"
            name="password"
            data-testid={signup ? "signup-password" : "login-password"}
            type="password"
            required
            value={password}
            onValueChange={setPassword}
            autoComplete={signup ? "new-password" : "current-password"}
            className={fieldClass}
          />
        </div>
        {error ? <p className={signup ? "text-sm text-red-300" : "text-sm text-destructive"}>{error}</p> : null}
        {signup ? (
          <button
            type="submit"
            data-testid="signup-submit"
            disabled={pending}
            className="w-full rounded-md bg-cyan-500 px-4 py-2 font-semibold text-slate-950 hover:bg-cyan-400 disabled:opacity-60"
          >
            {pending ? "Saving" : "Create account"}
          </button>
        ) : (
          <Button type="submit" data-testid="login-submit" className="h-11" disabled={pending}>
            {pending ? "Saving" : "Sign in"}
          </Button>
        )}
        <p className={signup ? "text-sm text-slate-400" : "text-sm text-muted-foreground"}>
          {signup ? (
            <>
              Already have a login?{" "}
              <Link href="/login" className="font-medium text-cyan-400">
                Sign in
              </Link>
            </>
          ) : (
            <>
              New company?{" "}
              <Link href="/signup" className="font-medium text-primary">
                Create an account
              </Link>
            </>
          )}
        </p>
      </form>
    </div>
  )
}
