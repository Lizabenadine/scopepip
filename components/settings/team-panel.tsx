"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useScope } from "@/lib/data/store"

interface Person {
  id: string
  name: string
  email: string
  role: "owner" | "project_manager" | "estimator"
}

export function TeamPanel() {
  const { session } = useScope()
  const [people, setPeople] = useState<Person[]>([])
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [staffRole, setStaffRole] = useState<"project_manager" | "estimator">("estimator")
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  useEffect(() => {
    let cancelled = false
    void fetch("/api/account/staff")
      .then((response) => response.json())
      .then((payload: { people?: Person[] }) => {
        if (!cancelled && Array.isArray(payload.people)) setPeople(payload.people)
      })
      .catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [])

  if (session?.role !== "owner") return null

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPending(true)
    setError(null)
    setNotice(null)
    try {
      const response = await fetch("/api/account/staff", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name, email, password, role: staffRole }),
      })
      const result = (await response.json()) as { ok?: boolean; reason?: string; user?: { name: string; email: string; role: Person["role"] } }
      if (!response.ok || !result.ok || !result.user) {
        setError(result.reason || "That login could not be added.")
        return
      }
      setPeople((current) => [...current, { id: result.user!.email, name: result.user!.name, email: result.user!.email, role: result.user!.role }])
      setName("")
      setEmail("")
      setPassword("")
      setNotice(
        `${result.user.name} can sign in as ${result.user.role === "estimator" ? "an estimator" : "a project manager"}.`,
      )
    } catch {
      setError("That login could not be added.")
    } finally {
      setPending(false)
    }
  }

  const planTier = session?.planTier || "pro"
  const extraSeats = session?.extraSeats || 0
  const maxSeats = planTier === "starter" ? 1 : planTier === "business" ? 5 + extraSeats : 3
  const planLabel =
    planTier === "starter"
      ? "Starter plan (1 seat)"
      : planTier === "business"
        ? `Business plan (${5 + extraSeats} seats)`
        : "Pro plan (3 seats)"

  return (
    <section className="rounded-2xl bg-card p-4 border border-slate-200 bg-white shadow-sm" data-testid="team-panel">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">People</h2>
        <span className="rounded-full bg-cyan-50 px-2.5 py-0.5 text-xs font-semibold text-cyan-800 border border-cyan-200">
          {people.length} of {maxSeats} seats used · {planLabel}
        </span>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        Each team member signs in with their own password. A project manager opens jobs and invoices. An estimator writes bids and does not open the rate card, dispatch, or invoices.
      </p>
      <ul className="mt-3 flex flex-col gap-1 text-sm">
        {people.map((person) => (
          <li key={person.id} className="flex items-center justify-between border-b border-slate-100 py-1.5 last:border-0">
            <span>
              <span className="font-semibold text-foreground">{person.name}</span> · <span className="text-muted-foreground">{person.email}</span>
            </span>
            <span className="text-xs font-medium text-muted-foreground capitalize">
              {person.role === "owner" ? "Owner" : person.role === "estimator" ? "Estimator" : "Project manager"}
            </span>
          </li>
        ))}
      </ul>
      {people.length >= maxSeats ? (
        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
          <p className="font-semibold">Seat limit reached ({people.length}/{maxSeats})</p>
          <p className="mt-0.5">
            {planTier === "starter"
              ? "Your Starter plan includes 1 seat. Upgrade to Pro for 3 seats or Business for 5 seats to invite team members."
              : planTier === "pro"
                ? "Your Pro plan includes 3 seats. Upgrade to Business for 5 included seats and support for add-on seats."
                : "Your Business plan includes 5 seats. Additional seats are $10/month per seat."}
          </p>
        </div>
      ) : null}
      {planTier === "business" ? (
        <div className="mt-3 rounded-xl border border-cyan-200 bg-cyan-50/60 p-3 text-xs text-cyan-950">
          <p className="font-semibold">Business Plan Seat Allowance</p>
          <p className="mt-0.5 text-cyan-800">
            5 seats included with base plan · {extraSeats} additional {extraSeats === 1 ? "seat" : "seats"} active ($10/seat/mo).
          </p>
        </div>
      ) : null}
      <form onSubmit={submit} className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="grid gap-1">
          <Label htmlFor="staff-name">Name</Label>
          <Input id="staff-name" data-testid="staff-name" value={name} onValueChange={setName} className="h-11" />
        </div>
        <div className="grid gap-1">
          <Label htmlFor="staff-email">Email</Label>
          <Input id="staff-email" data-testid="staff-email" type="email" value={email} onValueChange={setEmail} className="h-11" />
        </div>
        <div className="grid gap-1 sm:col-span-2">
          <Label htmlFor="staff-role">Role</Label>
          <select
            id="staff-role"
            data-testid="staff-role"
            className="h-11 rounded-lg border border-input bg-transparent px-2"
            value={staffRole}
            onChange={(event) => setStaffRole(event.target.value === "project_manager" ? "project_manager" : "estimator")}
          >
            <option value="estimator">Estimator</option>
            <option value="project_manager">Project manager</option>
          </select>
        </div>
        <div className="grid gap-1 sm:col-span-2">
          <Label htmlFor="staff-password">Password</Label>
          <Input id="staff-password" data-testid="staff-password" type="password" value={password} onValueChange={setPassword} className="h-11" />
        </div>
        {error ? <p className="text-sm text-destructive sm:col-span-2">{error}</p> : null}
        {notice ? <p className="text-sm text-muted-foreground sm:col-span-2">{notice}</p> : null}
        <Button type="submit" data-testid="staff-submit" className="h-11 sm:col-span-2 sm:w-fit" disabled={pending}>
          {pending ? "Saving" : "Add person"}
        </Button>
      </form>
    </section>
  )
}
