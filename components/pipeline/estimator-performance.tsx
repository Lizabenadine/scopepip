"use client"

import Link from "next/link"
import { useScope } from "@/lib/data/store"
import { estimatorPerformance } from "@/lib/auth/access"
import { useFieldLanguage } from "@/hooks/use-field-language"
import { officeLabel } from "@/lib/office/dashboard-copy"

export function EstimatorPerformance() {
  const { session, estimates } = useScope()
  const { language } = useFieldLanguage()
  const say = (text: string) => officeLabel(text, language)
  const stats = estimatorPerformance(estimates, session?.id ?? "")
  const mine = estimates.filter((estimate) => estimate.estimatorId === session?.id)

  return (
    <div className="flex flex-col gap-4" data-testid="estimator-performance">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{say("Dashboard")}</h1>
        <p className="text-sm text-muted-foreground">{say("Bids sent")}, {say("Win rate")}, {say("Your follow-ups")}</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label={say("Bids sent")} value={String(stats.bidsSent)} testId="estimator-bids" />
        <Stat label={say("Win rate")} value={stats.winRate === null ? "—" : `${stats.winRate}%`} testId="estimator-win-rate" />
        <Stat label={say("Your follow-ups")} value={String(stats.followUps)} testId="estimator-follow-ups" />
      </div>
      {mine.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border px-4 py-8 text-sm text-muted-foreground">
          {say("No bids in your name yet.")}
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {mine.map((estimate) => (
            <li key={estimate.id}>
              <Link href={`/estimates/${estimate.id}`} className="block rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                <span className="font-medium">{estimate.title}</span>
                <span className="mt-1 block text-sm text-muted-foreground">{estimate.jobAddress}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function Stat({ label, value, testId }: { label: string; value: string; testId: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{label}</p>
      <p className="mt-1 font-display text-3xl text-price tabular-nums" data-testid={testId}>
        {value}
      </p>
    </div>
  )
}
