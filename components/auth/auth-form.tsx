"use client"

import Link from "next/link"
import { useState } from "react"
import { readBrowserLogin, saveBrowserBook, saveBrowserLogin } from "@/lib/auth/browser-book"
import { homeForRole, type UserRole } from "@/lib/auth/role"
import type { OfficeSession } from "@/lib/auth/session"
import { isScopeState } from "@/lib/data/seed"
import { BrandLogo } from "@/components/brand/brand-logo"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const signup = mode === "signup"
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
      }
      if (!response.ok || !result.ok || !result.user) {
        setError(result.reason || (signup ? "That account could not be created." : "That sign-in did not work."))
        return
      }
      if (result.passwordHash) saveBrowserLogin(result.user, result.passwordHash)
      if (typeof result.revision === "number" && isScopeState(result.book)) {
        saveBrowserBook(result.user.companyId, result.revision, result.book)
      }
      window.location.assign(signup ? "/" : homeForRole(result.user.role))
    } catch {
      setError(signup ? "That account could not be created." : "That sign-in did not work.")
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="mx-auto grid w-full max-w-md gap-6">
      <BrandLogo />
      <form onSubmit={submit} className="grid gap-4 rounded-2xl bg-card p-5 ring-1 ring-foreground/10" data-testid={signup ? "signup-form" : "login-form"}>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{signup ? "Create the company login" : "Sign in"}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {signup
              ? "You are the owner. The sample jobs are copied onto this login only. Another company cannot see them."
              : "Sign in as the role on this account. An owner opens the office. A project manager opens progress jobs, work orders, and invoices."}
          </p>
        </div>
        {signup ? (
          <>
            <div className="grid gap-1">
              <Label htmlFor="signup-name">Your name</Label>
              <Input id="signup-name" data-testid="signup-name" value={name} onValueChange={setName} autoComplete="name" className="h-11" />
            </div>
            <div className="grid gap-1">
              <Label htmlFor="signup-company">Company name</Label>
              <Input id="signup-company" data-testid="signup-company" value={companyName} onValueChange={setCompanyName} autoComplete="organization" className="h-11" />
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
          </fieldset>
        )}
        <div className="grid gap-1">
          <Label htmlFor="auth-email">Email</Label>
          <Input
            id="auth-email"
            data-testid={signup ? "signup-email" : "login-email"}
            type="email"
            value={email}
            onValueChange={setEmail}
            autoComplete="email"
            className="h-11"
          />
        </div>
        <div className="grid gap-1">
          <Label htmlFor="auth-password">Password</Label>
          <Input
            id="auth-password"
            data-testid={signup ? "signup-password" : "login-password"}
            type="password"
            value={password}
            onValueChange={setPassword}
            autoComplete={signup ? "new-password" : "current-password"}
            className="h-11"
          />
        </div>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <Button type="submit" data-testid={signup ? "signup-submit" : "login-submit"} className="h-11" disabled={pending}>
          {pending ? "Saving" : signup ? "Create account" : "Sign in"}
        </Button>
        <p className="text-sm text-muted-foreground">
          {signup ? (
            <>
              Already have a login?{" "}
              <Link href="/login" className="font-medium text-primary">
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
