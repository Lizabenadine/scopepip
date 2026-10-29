"use client"

import Link from "next/link"
import { useFieldLanguage } from "@/hooks/use-field-language"
import { useScope } from "@/lib/data/store"
import { moneyExact } from "@/lib/format"
import { listActiveJobs } from "@/lib/work-orders/active"

export function ActiveJobs() {
  const { ready, estimates, workOrders, stages, clients, quoteEstimate } = useScope()
  const { copy } = useFieldLanguage()
  const jobs = listActiveJobs(estimates, workOrders, stages, clients)

  if (!ready) {
    return <div className="h-40 animate-pulse rounded-2xl bg-muted" aria-hidden />
  }

  return (
    <section className="flex flex-col gap-4" data-testid="active-jobs">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{copy.workOrdersTitle}</h1>
        <p className="text-sm text-muted-foreground">
          {jobs.length === 0 ? copy.acceptedEmpty : copy.acceptedCount(jobs.length)}
        </p>
      </div>
      {jobs.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">
          {copy.noActiveJobs}
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {jobs.map((job) => {
            const estimate = estimates.find((item) => item.id === job.id)
            const total = estimate ? quoteEstimate(estimate).total : 0
            return (
              <li key={job.id}>
                <Link
                  href={`/work-orders/${job.id}`}
                  data-testid={`active-job-${job.id}`}
                  className="flex flex-col gap-2 rounded-2xl bg-card p-4 ring-1 ring-foreground/10 sm:flex-row sm:items-center sm:justify-between"
                >
                  <span>
                    <span className="block font-medium">{job.clientName}</span>
                    <span className="block text-sm text-muted-foreground">
                      {job.title} · {job.jobAddress}
                    </span>
                  </span>
                  <span className="flex items-center justify-between gap-4 sm:justify-end">
                    <span className="text-sm text-muted-foreground">{copy.status[job.status]}</span>
                    <span className="font-medium tabular-nums">{moneyExact(total)}</span>
                  </span>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
