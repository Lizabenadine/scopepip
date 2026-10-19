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
  role: "owner" | "project_manager"
}

export function TeamPanel() {
  const { session } = useScope()
  const [people, setPeople] = useState<Person[]>([])
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
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
        body: JSON.stringify({ name, email, password }),
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
      setNotice(`${result.user.name} can sign in as a project manager.`)
    } catch {
      setError("That login could not be added.")
    } finally {
      setPending(false)
    }
  }

  return (
    <section className="rounded-2xl bg-card p-4 ring-1 ring-foreground/10" data-testid="team-panel">
      <h2 className="text-lg font-semibold">People</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        A project manager shares this company&apos;s jobs and signs in with their own password. They do not see Clients. The role is not a switch on this browser.
      </p>
      <ul className="mt-3 flex flex-col gap-1 text-sm">
        {people.map((person) => (
          <li key={person.id}>
            {person.name} · {person.email} · {person.role === "owner" ? "Owner" : "Project manager"}
          </li>
        ))}
      </ul>
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
          <Label htmlFor="staff-password">Password</Label>
          <Input id="staff-password" data-testid="staff-password" type="password" value={password} onValueChange={setPassword} className="h-11" />
        </div>
        {error ? <p className="text-sm text-destructive sm:col-span-2">{error}</p> : null}
        {notice ? <p className="text-sm text-muted-foreground sm:col-span-2">{notice}</p> : null}
        <Button type="submit" data-testid="staff-submit" className="h-11 sm:col-span-2 sm:w-fit" disabled={pending}>
          {pending ? "Saving" : "Add project manager"}
        </Button>
      </form>
    </section>
  )
}
