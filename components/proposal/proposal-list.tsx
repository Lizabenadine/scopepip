"use client"

import Link from "next/link"
import { useScope } from "@/lib/data/store"
import { moneyExact } from "@/lib/format"
import { listProposals } from "@/lib/proposals/catalog"

const STATUS_LABEL = {
  draft: "Draft",
  sent: "Sent",
  accepted: "Accepted",
  declined: "Declined",
} as const

export function ProposalList() {
  const { ready, estimates, clients, quoteEstimate } = useScope()
  const proposals = listProposals(estimates, clients)

  if (!ready) {
    return <div className="h-40 animate-pulse rounded-2xl bg-muted" aria-hidden />
  }

  return (
    <section className="flex flex-col gap-4" data-testid="proposal-list">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Proposals</h1>
        <p className="text-sm text-muted-foreground">
          {proposals.length === 0 ? "Sent and accepted proposals land here." : `${proposals.length} proposals`}
        </p>
      </div>
      {proposals.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">
          No proposals yet.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {proposals.map((proposal) => {
            const estimate = estimates.find((item) => item.id === proposal.id)
            const total = estimate ? quoteEstimate(estimate).total : 0
            return (
              <li key={proposal.id}>
                <Link
                  href={`/proposal/${proposal.id}`}
                  data-testid={`proposal-${proposal.id}`}
                  className="flex flex-col gap-2 rounded-2xl bg-card p-4 ring-1 ring-foreground/10 sm:flex-row sm:items-center sm:justify-between"
                >
                  <span>
                    <span className="block font-medium">{proposal.clientName}</span>
                    <span className="block text-sm text-muted-foreground">{proposal.title}</span>
                  </span>
                  <span className="flex items-center justify-between gap-4 sm:justify-end">
                    <span className="text-sm text-muted-foreground">{STATUS_LABEL[proposal.status]}</span>
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
