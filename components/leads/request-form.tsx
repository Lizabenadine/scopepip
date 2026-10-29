"use client"

import { useEffect, useState } from "react"
import { displayCompanyName } from "@/lib/brand/company"
import { Button } from "@/components/ui/button"

export function RequestEstimateForm({ slug }: { slug: string }) {
  const [companyName, setCompanyName] = useState("")
  const [missing, setMissing] = useState(false)
  const [name, setName] = useState("")
  const [phone, setPhone] = useState("")
  const [email, setEmail] = useState("")
  const [address, setAddress] = useState("")
  const [message, setMessage] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const company = displayCompanyName(companyName)

  useEffect(() => {
    let cancelled = false
    void fetch(`/api/public/companies/${encodeURIComponent(slug)}`)
      .then(async (response) => {
        if (!response.ok) {
          if (!cancelled) setMissing(true)
          return
        }
        const payload = (await response.json()) as { name?: string }
        if (!cancelled) setCompanyName(payload.name ?? "")
      })
      .catch(() => {
        if (!cancelled) setMissing(true)
      })
    return () => {
      cancelled = true
    }
  }, [slug])

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!name.trim() || !phone.trim()) {
      setError("A name and a phone number are required.")
      return
    }
    setSending(true)
    setError(null)
    try {
      const response = await fetch(`/api/leads/website?company=${encodeURIComponent(slug)}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          id: crypto.randomUUID(),
          name,
          phone,
          email,
          address,
          message,
        }),
      })
      const result = (await response.json()) as { ok?: boolean; reason?: string }
      if (!response.ok || !result.ok) {
        setError(result.reason || "That request could not be saved.")
        return
      }
      setSent(true)
    } catch {
      setError("That request could not be saved.")
    } finally {
      setSending(false)
    }
  }

  if (missing) {
    return (
      <div className="mx-auto grid max-w-lg gap-3 rounded-2xl bg-card p-6 border border-slate-200 bg-white shadow-sm">
        <h1 className="text-2xl font-semibold tracking-tight">This request link is not valid</h1>
        <p className="text-sm text-muted-foreground">Ask your painter for a new link.</p>
      </div>
    )
  }

  if (sent) {
    return (
      <div className="mx-auto grid max-w-lg gap-3 rounded-2xl bg-card p-6 border border-slate-200 bg-white shadow-sm" data-testid="lead-success">
        <h1 className="text-2xl font-semibold tracking-tight">Request received</h1>
        <p className="text-sm text-muted-foreground">
          {company} has the request and will follow up by text.
        </p>
      </div>
    )
  }

  return (
    <form
      onSubmit={(event) => void submit(event)}
      className="mx-auto grid max-w-lg gap-4 rounded-2xl bg-card p-6 border border-slate-200 bg-white shadow-sm"
      data-testid="lead-form"
    >
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Request a painting estimate</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Tell {company} what needs painting. This opens a Cold Leads card and starts the follow-up texts.
        </p>
      </div>
      <label className="grid gap-1 text-sm font-medium">
        Name
        <input
          data-testid="lead-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          required
          className="h-11 rounded-lg border border-input bg-transparent px-3 text-sm font-normal outline-none"
        />
      </label>
      <label className="grid gap-1 text-sm font-medium">
        Phone
        <input
          data-testid="lead-phone"
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
          type="tel"
          required
          className="h-11 rounded-lg border border-input bg-transparent px-3 text-sm font-normal outline-none"
        />
      </label>
      <label className="grid gap-1 text-sm font-medium">
        Email
        <input
          data-testid="lead-email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          type="email"
          className="h-11 rounded-lg border border-input bg-transparent px-3 text-sm font-normal outline-none"
        />
      </label>
      <label className="grid gap-1 text-sm font-medium">
        Address
        <input
          data-testid="lead-address"
          value={address}
          onChange={(event) => setAddress(event.target.value)}
          className="h-11 rounded-lg border border-input bg-transparent px-3 text-sm font-normal outline-none"
        />
      </label>
      <label className="grid gap-1 text-sm font-medium">
        What needs painting?
        <textarea
          data-testid="lead-message"
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          rows={4}
          className="rounded-lg border border-input bg-transparent px-3 py-2 text-sm font-normal outline-none"
        />
      </label>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <Button type="submit" disabled={sending} data-testid="lead-submit" className="h-11">
        {sending ? "Sending..." : "Request estimate"}
      </Button>
    </form>
  )
}
