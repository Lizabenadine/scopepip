"use client"

import Link from "next/link"
import { useFieldLanguage } from "@/hooks/use-field-language"
import { useScope } from "@/lib/data/store"
import { officeLabel } from "@/lib/office/dashboard-copy"
import { money } from "@/lib/format"

export function ClientBook() {
  const { ready, clients, estimates, quoteEstimate } = useScope()
  const { language } = useFieldLanguage()
  const say = (text: string) => officeLabel(text, language)

  if (!ready) {
    return <div className="h-40 animate-pulse rounded-2xl bg-muted" aria-hidden />
  }

  const rows = [...clients].sort((a, b) => a.name.localeCompare(b.name))

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{say("Clients")}</h1>
        <p className="text-sm text-muted-foreground">
          {language === "es" ? "Personas y propiedades ligadas a un precio." : "People and properties attached to a price."}
        </p>
      </div>
      {rows.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">
          {language === "es" ? "Todavía no hay clientes. Guarde un estimado y el nombre llega aquí." : "No clients yet. Save an estimate and the name lands here."}
        </p>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {rows.map((client) => {
            const jobs = estimates.filter((estimate) => estimate.clientId === client.id)
            const total = jobs.reduce(
              (sum, estimate) => sum + quoteEstimate(estimate).total,
              0,
            )
            return (
              <li key={client.id}>
                <Link
                  href={`/clients/${client.id}`}
                  className="block rounded-2xl bg-card p-4 border border-slate-200 bg-white shadow-sm hover:border-slate-300"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="truncate font-semibold">{client.name}</h2>
                      <p className="truncate text-sm text-muted-foreground">
                        {client.phone || client.address || "No phone yet"}
                      </p>
                    </div>
                    <p className="font-display text-xl leading-none tabular-nums">
                      {money(total)}
                    </p>
                  </div>
                  <p className="mt-3 text-sm text-muted-foreground">
                    {jobs.length === 1 ? "1 job" : `${jobs.length} jobs`}
                  </p>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
