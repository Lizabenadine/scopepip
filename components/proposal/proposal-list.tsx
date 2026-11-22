"use client"

import Link from "next/link"
import { useSearchParams, useRouter } from "next/navigation"
import { useState, useMemo } from "react"
import { CheckCircle2, FileCheck2, Search, Send, Clock, ExternalLink, Briefcase, Download, XCircle, FileText } from "lucide-react"
import { useScope } from "@/lib/data/store"
import { moneyExact } from "@/lib/format"
import { listProposals } from "@/lib/proposals/catalog"
import { ProposalSendEmailButton } from "@/components/proposal/proposal-send-email-button"
import { cn } from "@/lib/utils"

const STATUS_LABEL = {
  draft: "Draft",
  sent: "Sent",
  accepted: "Accepted",
  declined: "Declined",
} as const

type ProposalTab = "all" | "signed" | "sent" | "draft"

export function ProposalList() {
  const { ready, estimates, clients, quoteEstimate } = useScope()
  const searchParams = useSearchParams()
  const router = useRouter()
  const tabParam = searchParams.get("tab")
  const activeTab: ProposalTab =
    tabParam === "signed" ? "signed" :
    tabParam === "sent" ? "sent" :
    tabParam === "draft" ? "draft" :
    "all"

  const [search, setSearch] = useState("")

  const allProposals = useMemo(
    () => listProposals(estimates, clients, { includeDrafts: true }),
    [estimates, clients]
  )

  const signedProposals = useMemo(
    () => allProposals.filter((p) => p.isSigned || p.status === "accepted"),
    [allProposals]
  )
  const sentProposals = useMemo(
    () => allProposals.filter((p) => p.status === "sent" && !p.isSigned),
    [allProposals]
  )
  const draftProposals = useMemo(
    () => allProposals.filter((p) => p.status === "draft" && !p.isSigned),
    [allProposals]
  )

  const displayedProposals = useMemo(() => {
    let list =
      activeTab === "signed"
        ? signedProposals
        : activeTab === "sent"
        ? sentProposals
        : activeTab === "draft"
        ? draftProposals
        : allProposals
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter((p) => p.clientName.toLowerCase().includes(q) || p.title.toLowerCase().includes(q))
    }
    return list
  }, [activeTab, signedProposals, sentProposals, draftProposals, allProposals, search])

  if (!ready) {
    return <div className="h-40 animate-pulse rounded-2xl bg-muted" aria-hidden />
  }

  function setTab(tab: ProposalTab) {
    const params = new URLSearchParams(searchParams.toString())
    if (tab === "all") params.delete("tab")
    else params.set("tab", tab)
    router.replace(`/proposal?${params.toString()}`, { scroll: false })
  }

  return (
    <section className="flex flex-col gap-6" data-testid="proposal-list">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            {activeTab === "signed"
              ? "Signed Proposals & Contracts"
              : activeTab === "sent"
              ? "Sent Proposals"
              : activeTab === "draft"
              ? "Draft Proposals"
              : "Documents & Proposals"}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {activeTab === "signed"
              ? "All signed client agreements, accepted contracts, and authorized scopes."
              : activeTab === "sent"
              ? "Proposals delivered to customers awaiting acceptance."
              : activeTab === "draft"
              ? "Working drafts being prepared before sending."
              : "Review sent quotes, drafts, and signed client agreements."}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/estimate"
            className="inline-flex h-9 items-center justify-center rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white shadow-xs hover:bg-blue-700 transition-colors"
          >
            + New Proposal
          </Link>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setTab("signed")}
            data-testid="tab-signed-proposals"
            className={cn(
              "inline-flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-all",
              activeTab === "signed"
                ? "bg-emerald-600 text-white shadow-xs"
                : "bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200/60"
            )}
          >
            <FileCheck2 className="size-3.5" />
            Signed Proposals ({signedProposals.length})
          </button>
          <button
            type="button"
            onClick={() => setTab("sent")}
            data-testid="tab-sent-proposals"
            className={cn(
              "inline-flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-all",
              activeTab === "sent"
                ? "bg-blue-600 text-white shadow-xs"
                : "bg-blue-50 text-blue-800 hover:bg-blue-100 border border-blue-200/60"
            )}
          >
            <Send className="size-3.5" />
            Sent ({sentProposals.length})
          </button>
          <button
            type="button"
            onClick={() => setTab("draft")}
            data-testid="tab-draft-proposals"
            className={cn(
              "inline-flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-all",
              activeTab === "draft"
                ? "bg-slate-800 text-white shadow-xs"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200/60"
            )}
          >
            <Clock className="size-3.5" />
            Drafts ({draftProposals.length})
          </button>
          <button
            type="button"
            onClick={() => setTab("all")}
            data-testid="tab-all-proposals"
            className={cn(
              "rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-all",
              activeTab === "all"
                ? "bg-slate-900 text-white shadow-xs"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            )}
          >
            All ({allProposals.length})
          </button>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search proposals..."
            className="h-8.5 w-full rounded-xl border border-slate-200 bg-white pl-8 pr-3 text-xs placeholder:text-slate-400 focus:border-blue-500 focus:outline-none"
          />
        </div>
      </div>

      {displayedProposals.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 p-12 text-center">
          <p className="text-sm font-medium text-slate-600">
            {activeTab === "signed"
              ? "No signed proposals yet. When customers accept and sign a proposal, they appear here."
              : activeTab === "sent"
              ? "No sent proposals awaiting review."
              : activeTab === "draft"
              ? "No draft proposals."
              : "No proposals found."}
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {displayedProposals.map((proposal) => {
            const estimate = estimates.find((item) => item.id === proposal.id)
            const total = estimate ? quoteEstimate(estimate).total : 0
            const isSigned = proposal.isSigned || proposal.status === "accepted"

            return (
              <li key={proposal.id}>
                <div
                  data-testid={`proposal-card-${proposal.id}`}
                  className={cn(
                    "flex flex-col gap-4 rounded-2xl border p-4 bg-white shadow-xs transition-all lg:flex-row lg:items-center lg:justify-between",
                    isSigned ? "border-emerald-200 hover:border-emerald-300" : "border-slate-200 hover:border-slate-300"
                  )}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Link
                        href={`/proposal/${proposal.id}`}
                        data-testid={`proposal-${proposal.id}`}
                        className="font-semibold text-slate-900 hover:text-blue-600 hover:underline"
                      >
                        {proposal.clientName}
                      </Link>
                      {isSigned ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-800">
                          <CheckCircle2 className="size-3" /> Signed & Accepted
                        </span>
                      ) : proposal.status === "sent" ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-800">
                          <Send className="size-3" /> Sent
                        </span>
                      ) : proposal.status === "draft" ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
                          <Clock className="size-3" /> Draft
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                          <XCircle className="size-3" /> {STATUS_LABEL[proposal.status]}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-1 truncate">
                      {proposal.title}
                      {proposal.signedName ? (
                        <span className="ml-2 font-medium text-emerald-700">· Signed by {proposal.signedName}</span>
                      ) : null}
                      {proposal.signedAt ? (
                        <span className="ml-1.5 text-slate-400">({new Date(proposal.signedAt).toLocaleDateString()})</span>
                      ) : null}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3 sm:justify-end shrink-0">
                    <span className="text-base font-bold font-display text-slate-900 tabular-nums">
                      {moneyExact(total)}
                    </span>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Link
                        href={`/proposal/${proposal.id}`}
                        className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-2xs"
                      >
                        View
                      </Link>

                      <a
                        href={`/api/proposals/${proposal.id}/pdf`}
                        download={`proposal-${proposal.id}.pdf`}
                        data-testid={`download-pdf-${proposal.id}`}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-900 shadow-2xs transition-colors"
                      >
                        <Download className="size-3.5 text-slate-500" />
                        <span>Download PDF</span>
                      </a>

                      <ProposalSendEmailButton
                        estimateId={proposal.id}
                        clientEmail={proposal.clientEmail}
                        isSigned={isSigned}
                      />

                      {isSigned && (
                        <Link
                          href={`/work-orders/${proposal.id}`}
                          className="inline-flex items-center gap-1 rounded-xl bg-emerald-50 border border-emerald-200 px-2.5 py-1.5 text-xs font-semibold text-emerald-800 hover:bg-emerald-100 shadow-2xs"
                        >
                          <Briefcase className="size-3" /> Work Order
                        </Link>
                      )}

                      {proposal.publicToken && (
                        <Link
                          href={`/p/${proposal.publicToken}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="Open Customer Proposal Link"
                          className="inline-flex items-center p-1.5 rounded-xl border border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-50 shadow-2xs"
                        >
                          <ExternalLink className="size-3.5" />
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
