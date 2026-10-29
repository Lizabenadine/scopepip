"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { ChevronLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { contactHistory } from "@/lib/clients/history"
import { useFieldLanguage } from "@/hooks/use-field-language"
import { useScope } from "@/lib/data/store"
import { officeLabel } from "@/lib/office/dashboard-copy"
import { money, scopeSummary } from "@/lib/format"

export function ClientDetail({ id }: { id: string }) {
  const router = useRouter()
  const scope = useScope()
  const { language } = useFieldLanguage()
  const say = (text: string) => officeLabel(text, language)
  const client = scope.clientById(id)
  const [error, setError] = useState<string | null>(null)

  if (!scope.ready) {
    return <div className="h-40 animate-pulse rounded-2xl bg-muted" aria-hidden />
  }

  if (!client) {
    return (
      <div className="rounded-2xl border border-dashed border-border px-4 py-10 text-center">
        <h1 className="text-xl font-semibold">Client not in this book</h1>
        <Link href="/clients" className="mt-3 inline-block text-sm font-medium text-primary">
          All clients
        </Link>
      </div>
    )
  }

  const jobs = scope.estimates.filter((estimate) => estimate.clientId === client.id)

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <Link
        href="/clients"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="size-4" />
        Clients
      </Link>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{client.name}</h1>
        <p className="text-sm text-muted-foreground">
          Contact details stay with every estimate for this name.
        </p>
      </div>
      <label className="grid max-w-xs gap-2 text-sm font-medium">
        {say("Messages in")}
        <select
          data-testid="client-language"
          className="h-11 rounded-lg border border-input bg-background px-3"
          value={client.language === "es" ? "es" : "en"}
          onChange={(event) => {
            scope.updateClient(client.id, { language: event.target.value === "es" ? "es" : "en" })
          }}
        >
          <option value="en">English</option>
          <option value="es">Español</option>
        </select>
      </label>
      <form
        className="grid gap-3"
        onSubmit={(event) => {
          event.preventDefault()
          const data = new FormData(event.currentTarget)
          const name = String(data.get("name") ?? "").trim()
          if (!name) {
            setError("A client needs a name.")
            return
          }
          scope.updateClient(client.id, {
            name,
            phone: String(data.get("phone") ?? "").trim(),
            email: String(data.get("email") ?? "").trim(),
            address: String(data.get("address") ?? "").trim(),
            notes: String(data.get("notes") ?? "").trim(),
          })
          setError(null)
        }}
      >
        <Field id="name" label="Name" name="name" defaultValue={client.name} />
        <Field id="phone" label="Phone" name="phone" defaultValue={client.phone} />
        <Field id="email" label="Email" name="email" defaultValue={client.email} type="email" />
        <Field id="address" label="Address" name="address" defaultValue={client.address} />
        <div className="grid gap-2">
          <Label htmlFor="notes">Notes</Label>
          <textarea
            id="notes"
            name="notes"
            defaultValue={client.notes}
            className="min-h-20 w-full rounded-lg border border-input bg-transparent px-3 py-2 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          />
        </div>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <Button type="submit" className="h-11 w-fit">
          Save contact
        </Button>
      </form>
      <History clientId={client.id} />
      <section className="flex flex-col gap-2">
        <h2 className="text-xs font-semibold tracking-[0.14em] text-muted-foreground uppercase">
          Jobs
        </h2>
        {jobs.length === 0 ? (
          <p className="text-sm text-muted-foreground">No estimates for this client.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {jobs.map((estimate) => {
              const quote = scope.quoteEstimate(estimate)
              const stage = scope.stageById(estimate.stageId)
              return (
                <li key={estimate.id}>
                  <Link
                    href={`/estimates/${estimate.id}`}
                    className="flex items-center justify-between gap-3 rounded-2xl bg-card px-4 py-3 border border-slate-200 bg-white shadow-sm"
                  >
                    <span>
                      <span className="block font-medium">{estimate.title}</span>
                      <span className="block text-xs text-muted-foreground">
                        {stage?.name} · {scopeSummary(estimate)}
                      </span>
                    </span>
                    <span className="font-display text-xl tabular-nums">
                      {money(quote.total)}
                    </span>
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
      </section>
      <div>
        <Button
          type="button"
          variant="destructive"
          className="h-11"
          onClick={() => {
            const result = scope.deleteClient(client.id)
            if (!result.ok) {
              setError(result.reason)
              return
            }
            router.push("/clients")
          }}
        >
          Delete client
        </Button>
      </div>
    </div>
  )
}

function History({ clientId }: { clientId: string }) {
  const scope = useScope()
  const client = scope.clientById(clientId)
  if (!client) return null
  const entries = contactHistory(client, scope.estimates)
  return (
    <section className="flex flex-col gap-2" data-testid="contact-history">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-xs font-semibold tracking-[0.14em] text-muted-foreground uppercase">History</h2>
        <Link href={`/inbox?client=${client.id}`} className="text-sm font-medium text-primary">
          Open thread
        </Link>
      </div>
      {entries.length === 0 ? (
        <p className="text-sm text-muted-foreground">No texts, emails, proposal opens, stage changes, or notes yet.</p>
      ) : (
        <ol className="flex flex-col gap-2">
          {entries.map((entry) => (
            <li key={entry.id} className="rounded-2xl bg-card px-4 py-3 border border-slate-200 bg-white shadow-sm" data-testid={`history-${entry.kind}`}>
              <div className="flex items-baseline justify-between gap-3">
                <p className="text-sm font-medium">{entry.label}</p>
                <time className="shrink-0 text-xs text-muted-foreground" dateTime={entry.at}>
                  {historyWhen(entry.at)}
                </time>
              </div>
              <p className="mt-1 line-clamp-4 text-sm whitespace-pre-wrap text-muted-foreground">{entry.body}</p>
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}

function historyWhen(iso: string): string {
  const ms = Date.parse(iso)
  if (!Number.isFinite(ms)) return ""
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(ms)
}

function Field({
  id,
  label,
  name,
  defaultValue,
  type = "text",
}: {
  id: string
  label: string
  name: string
  defaultValue: string
  type?: string
}) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} name={name} type={type} defaultValue={defaultValue} className="h-11" />
    </div>
  )
}
