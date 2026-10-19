"use client"

import Link from "next/link"
import { useState } from "react"
import { DealMenu } from "@/components/pipeline/deal-menu"
import { Badge } from "@/components/ui/badge"
import { SCOPE_VERSION } from "@/lib/data/seed"
import { useScope } from "@/lib/data/store"
import { appointmentLabel } from "@/lib/appointments/visit"
import { describeFollowUp, visitDayOf } from "@/lib/follow-ups/schedule"
import { latestInbound } from "@/lib/messages/thread"
import { latestProposalOpen } from "@/lib/proposals/opens"
import { money } from "@/lib/format"
import { DEAL_LABELS, invoiceStatus, jobStageOf, LEAD_SOURCE_LABELS, salesStageOf } from "@/lib/pipeline/board"
import { leadScore } from "@/lib/pipeline/score"
import { suggestFollowUp } from "@/lib/pipeline/suggest"
import { displayCompanyName } from "@/lib/brand/company"
import type { FollowUpMessage, FollowUpStage } from "@/lib/follow-ups/types"
import type { Estimate } from "@/lib/types"

export function DealCard({
  estimate,
  clientName,
  total,
  mode,
}: {
  estimate: Estimate
  clientName: string
  total: number
  mode: "sales" | "jobs"
}) {
  const scope = useScope()
  const { setEstimateTags } = scope
  const [labelsOpen, setLabelsOpen] = useState(false)
  const [sendingSuggestion, setSendingSuggestion] = useState(false)
  const source = estimate.leadSource
  const tags = estimate.tags ?? []
  const followUpStatus = describeFollowUp(
    {
      version: SCOPE_VERSION,
      clients: scope.clients,
      stages: scope.stages,
      estimates: scope.estimates,
      workOrders: scope.workOrders,
      crews: scope.crews,
      productionRates: scope.productionRates,
      estimateSettings: scope.estimateSettings,
      paymentMethods: scope.paymentMethods,
      followUpSequences: scope.followUpSequences,
    },
    estimate,
    Date.now(),
  )
  const visitDay = visitDayOf(estimate)
  const lastMessage = estimate.followUpLog?.[estimate.followUpLog.length - 1]
  const reply = latestInbound(scope.clients.find((client) => client.id === estimate.clientId)?.messages)
  const replyOnDeal = reply?.estimateId === estimate.id ? reply : null
  const proposalOpen = latestProposalOpen(estimate)
  const client = scope.clients.find((item) => item.id === estimate.clientId)
  const replied = Boolean(replyOnDeal?.body.trim())
  const score = leadScore(estimate, client, replied)
  const stage = scope.stageById(estimate.stageId)
  const order = scope.workOrders.find((item) => item.estimateId === estimate.id)
  const suggestion = suggestFollowUp({
    estimate,
    client,
    company: displayCompanyName(scope.estimateSettings.companyName),
    reply: replyOnDeal?.body,
    order,
    stageSlug: stage?.slug,
  })

  function toggleLabel(label: string) {
    const next = tags.includes(label) ? tags.filter((tag) => tag !== label) : [...tags, label]
    setEstimateTags(estimate.id, next)
  }

  async function sendSuggestion() {
    if (!client || suggestion.channel === "none" || sendingSuggestion) return
    setSendingSuggestion(true)
    const to = suggestion.channel === "text" ? client.phone : client.email
    const column = salesStageOf(estimate) ?? jobStageOf(estimate, order, stage?.slug) ?? "cold"
    try {
      const response = await fetch("/api/follow-ups/send", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          channel: suggestion.channel,
          to,
          subject: suggestion.label,
          body: suggestion.body,
          fromName: displayCompanyName(scope.estimateSettings.companyName),
        }),
      })
      const payload = (await response.json()) as { delivery?: string; detail?: string }
      const delivery = payload.delivery === "sent" || payload.delivery === "logged" || payload.delivery === "skipped" ? payload.delivery : "skipped"
      const message: FollowUpMessage = {
        id: crypto.randomUUID(),
        estimateId: estimate.id,
        stepId: "suggestion",
        stage: column as FollowUpStage,
        channel: suggestion.channel,
        to,
        subject: suggestion.label,
        body: suggestion.body,
        sentAt: new Date().toISOString(),
        delivery,
        detail: payload.detail || "",
      }
      scope.recordFollowUpDelivery(message)
    } finally {
      setSendingSuggestion(false)
    }
  }

  return (
    <article
      data-testid={`pipeline-card-${estimate.id}`}
      className="flex flex-col gap-3 rounded-2xl bg-card p-4 ring-1 ring-foreground/10"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate font-medium">
            <Link href={`/estimates/${estimate.id}`} className="hover:underline">
              {clientName}
            </Link>
          </h3>
          <p className="truncate text-sm text-muted-foreground">{estimate.title}</p>
        </div>
        <div className="flex flex-col items-end gap-1">
          {estimate.areas.length === 0 && estimate.lineItems.length === 0 ? (
            <p className="text-sm text-muted-foreground">Not priced</p>
          ) : (
            <p className="font-display text-2xl leading-none text-price tabular-nums">{money(total)}</p>
          )}
          <DealMenu estimate={estimate} clientName={clientName} mode={mode} />
        </div>
      </div>
      <p className="text-sm">{estimate.jobAddress || "No address yet"}</p>
      {mode === "sales" ? (
        <Link href={`/book/${estimate.publicToken}`} className="text-xs font-medium text-primary" data-testid={`book-link-${estimate.id}`}>
          Booking page
        </Link>
      ) : null}
      {visitDay ? (
        <p className="text-sm font-medium" data-testid={`visit-${estimate.id}`}>
          {appointmentLabel(visitDay, estimate.estimateVisitAt)}
        </p>
      ) : null}
      <p className="text-xs text-muted-foreground" data-testid={`follow-up-${estimate.id}`}>
        {followUpStatus}
      </p>
      <p className="text-sm font-medium" data-testid={`lead-score-${estimate.id}`} title={score.reasons.join(" · ")}>
        Score {score.score}
      </p>
      <div className="rounded-xl bg-muted/50 px-3 py-2" data-testid={`suggested-follow-up-${estimate.id}`}>
        <p className="text-xs font-medium">{suggestion.label}</p>
        <p className="mt-1 line-clamp-4 text-xs whitespace-pre-wrap text-muted-foreground">{suggestion.body}</p>
        {suggestion.channel === "none" ? null : (
          <button
            type="button"
            className="mt-2 text-xs font-medium text-primary"
            data-testid={`send-suggestion-${estimate.id}`}
            disabled={sendingSuggestion}
            onClick={() => void sendSuggestion()}
          >
            {sendingSuggestion ? "Sending..." : "Send suggestion"}
          </button>
        )}
      </div>
      {proposalOpen ? (
        <p className="text-xs" data-testid={`proposal-open-${estimate.id}`}>
          {proposalOpen.kind === "revisit" ? "Opened the proposal again" : "Opened the proposal"}
        </p>
      ) : null}
      {replyOnDeal ? (
        <p className="line-clamp-2 text-xs" data-testid={`deal-reply-${estimate.id}`}>
          <Link href={`/inbox?client=${estimate.clientId}`} className="font-medium text-primary">
            Reply
          </Link>
          {": "}
          {replyOnDeal.body || "Photo"}
        </p>
      ) : (
        <Link href={`/inbox?client=${estimate.clientId}`} className="text-xs font-medium text-primary">
          Texts
        </Link>
      )}
      {lastMessage ? (
        <p className="line-clamp-2 text-xs text-muted-foreground" data-testid={`follow-up-last-${estimate.id}`}>
          {lastMessage.delivery === "logged" ? "Logged" : lastMessage.delivery === "sent" ? "Sent" : "Skipped"}:{" "}
          {lastMessage.body}
        </p>
      ) : null}
      <p className="text-xs text-muted-foreground">
        {source ? LEAD_SOURCE_LABELS[source] : "No source"}
        {estimate.salesperson ? ` · ${estimate.salesperson}` : ""}
        {` · ${invoiceStatus(estimate, total)}`}
      </p>
      <div className="flex flex-wrap items-center gap-1.5">
        {tags.map((tag) => (
          <Badge key={tag} variant="outline">
            {tag}
          </Badge>
        ))}
        <button
          type="button"
          className="text-xs font-medium text-primary"
          aria-expanded={labelsOpen}
          data-testid={`add-label-${estimate.id}`}
          onClick={() => setLabelsOpen((current) => !current)}
        >
          {labelsOpen ? "Close tags" : "Tag"}
        </button>
      </div>
      {labelsOpen ? (
        <div className="flex flex-wrap gap-1.5" data-testid={`labels-${estimate.id}`}>
          {DEAL_LABELS.map((label) => (
            <button
              key={label}
              type="button"
              aria-pressed={tags.includes(label)}
              className={
                tags.includes(label)
                  ? "rounded-full bg-primary px-2.5 py-1 text-xs text-primary-foreground"
                  : "rounded-full bg-muted px-2.5 py-1 text-xs"
              }
              onClick={() => toggleLabel(label)}
            >
              {label}
            </button>
          ))}
        </div>
      ) : null}
    </article>
  )
}
