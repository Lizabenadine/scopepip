"use client"

import Link from "next/link"
import { officeLabel } from "@/lib/office/dashboard-copy"
import type { OfficeQueues } from "@/lib/office/workflow"
import type { FieldLanguage } from "@/lib/field/language"
import { moneyExact } from "@/lib/format"

export function OfficeQueues({ queues, language }: { queues: OfficeQueues; language: FieldLanguage }) {
  const say = (text: string) => officeLabel(text, language)
  const sections = [
    { id: "upcoming", title: "Upcoming jobs", rows: queues.upcoming, empty: "No jobs are scheduled." },
    { id: "follow-ups", title: "Follow-ups due", rows: queues.followUps, empty: "No follow-ups are due." },
    { id: "estimates", title: "Outstanding estimates", rows: queues.estimates, empty: "No estimates are waiting." },
    { id: "invoices", title: "Unpaid invoices", rows: queues.invoices, empty: "No invoices are open." },
  ]
  return (
    <div className="grid gap-3 lg:grid-cols-2" data-testid="office-queues">
      {sections.map((section) => (
        <section key={section.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-sm font-semibold tracking-tight text-[#02182F]">{say(section.title)}</h2>
          {section.rows.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">{say(section.empty)}</p>
          ) : (
            <ul className="mt-3 flex flex-col gap-2">
              {section.rows.map((row) => (
                <li key={row.id}>
                  <Link href={row.href} className="flex min-h-11 items-center justify-between gap-3 rounded-xl px-2 py-2 hover:bg-slate-50">
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium">{row.title}</span>
                      <span className="block truncate text-xs text-muted-foreground">{row.detail}</span>
                    </span>
                    {row.amount && row.amount > 0 ? (
                      <span className="shrink-0 text-sm font-semibold text-price tabular-nums">{moneyExact(row.amount)}</span>
                    ) : null}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      ))}
    </div>
  )
}
