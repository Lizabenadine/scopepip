"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState, type MouseEvent, type PointerEvent } from "react"
import { CalendarClock, GripVertical, Users } from "lucide-react"
import { CardNotesSection } from "@/components/pipeline/card-notes-section"
import { DealMenu } from "@/components/pipeline/deal-menu"
import { NavigateToJobsite } from "@/components/pipeline/navigate-jobsite"
import { ScheduleDialog } from "@/components/pipeline/schedule-dialog"
import { SmartFollowUpBanner } from "@/components/pipeline/smart-follow-up-banner"
import { Badge } from "@/components/ui/badge"
import { Button, buttonVariants } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { SCOPE_VERSION } from "@/lib/data/seed"
import { useScope } from "@/lib/data/store"
import { appointmentLabel, localVisitClock } from "@/lib/appointments/visit"
import { describeFollowUp, visitDayOf } from "@/lib/follow-ups/schedule"
import { latestInbound } from "@/lib/messages/thread"
import { latestProposalOpen } from "@/lib/proposals/opens"
import { useClientNow } from "@/lib/browser/client-env"
import { useFieldLanguage } from "@/hooks/use-field-language"
import { fieldJobHeading } from "@/lib/field/copy"
import { money } from "@/lib/format"
import { officeOnSite } from "@/lib/office/dashboard-copy"
import { DEAL_LABELS, invoiceStatus, jobStageOf, LEAD_SOURCE_LABELS, nextSalesStage, SALES_COLUMNS, salesStageOf } from "@/lib/pipeline/board"
import { leadScore } from "@/lib/pipeline/score"
import { suggestFollowUp } from "@/lib/pipeline/suggest"
import { displayCompanyName } from "@/lib/brand/company"
import { cn } from "@/lib/utils"
import type { FollowUpMessage, FollowUpStage } from "@/lib/follow-ups/types"
import type { Estimate } from "@/lib/types"

export interface DealCardProps {
  estimate: Estimate
  clientName: string
  total: number
  mode: "sales" | "jobs"
  allColumns?: { id: string; label: string }[]
  isDragging?: boolean
  isOverlay?: boolean
  onDragStart?: (event: PointerEvent<HTMLElement>) => void
  onMoveToColumn?: (targetColumnId: string) => void
}

export function DealCard({
  estimate,
  clientName,
  total,
  mode,
  allColumns = [],
  isDragging = false,
  isOverlay = false,
  onDragStart,
  onMoveToColumn,
}: DealCardProps) {
  const router = useRouter()
  const scope = useScope()
  const { language } = useFieldLanguage()
  const jobLanguage = mode === "jobs" ? language : "en"
  const limited = scope.session?.role === "project_manager"
  const { setEstimateTags } = scope
  const now = useClientNow() ?? 0
  const [labelsOpen, setLabelsOpen] = useState(false)
  const [contactOpen, setContactOpen] = useState(false)
  const [contactNote, setContactNote] = useState("")
  const [visitOpen, setVisitOpen] = useState(false)
  const [scheduleOpen, setScheduleOpen] = useState(false)
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
    now,
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
  const salesStage = mode === "sales" ? salesStageOf(estimate) : null
  const nextSales = salesStage ? nextSalesStage(salesStage) : null
  const nextStep = nextSales
    ? scope.columnLabels?.[nextSales]?.trim() || SALES_COLUMNS.find((column) => column.id === nextSales)?.label
    : null
  const order = scope.workOrders.find((item) => item.estimateId === estimate.id)
  const suggestion = suggestFollowUp({
    estimate,
    client,
    company: displayCompanyName(scope.estimateSettings.companyName),
    reply: replyOnDeal?.body,
    order,
    stageSlug: stage?.slug,
    reviewUrl: scope.estimateSettings.reviewUrl,
  })

  const jobStage = mode === "jobs" ? jobStageOf(estimate, order, stage?.slug) : null

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

  const handleJobsCardClick = (e: MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement
    if (target.closest("button, a, input, select, textarea, [data-interactive='true']")) {
      return
    }
    if (isDragging) return
    router.push(limited ? `/work-orders/${estimate.id}` : `/estimates/${estimate.id}`)
  }

  const handlePointerDown = (e: PointerEvent<HTMLElement>) => {
    const target = e.target as HTMLElement
    if (target.closest("button:not([data-drag-handle]), a, input, select, textarea, [data-interactive='true']:not([data-drag-handle])")) {
      return
    }
    onDragStart?.(e)
  }

  if (mode === "jobs") {
    const jobStageLabel =
      jobStage === "project_completed"
        ? "Completed"
        : jobStage === "project_in_progress"
          ? "In production"
          : jobStage === "project_scheduled"
            ? "Scheduled"
            : "Accepted"

    const jobStageTone =
      jobStage === "project_completed"
        ? "bg-emerald-100 text-emerald-800 border-emerald-200"
        : jobStage === "project_in_progress"
          ? "bg-blue-100 text-blue-800 border-blue-200"
          : jobStage === "project_scheduled"
            ? "bg-amber-100 text-amber-800 border-amber-200"
            : "bg-indigo-100 text-indigo-800 border-indigo-200"

    const scheduledDate = order?.scheduledStartDate || estimate.scheduledOn
    const assignedCrew = order?.assignedCrewId
      ? scope.crews.find((c) => c.id === order.assignedCrewId)
      : undefined

    const cardClasses = cn(
      "group relative flex w-full min-w-0 flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm select-none transition-all duration-150",
      !isOverlay && "hover:border-slate-300 hover:shadow-md cursor-pointer",
      isDragging && "opacity-30 border-2 border-dashed border-primary/40 bg-primary/[0.03]",
      isOverlay && "shadow-2xl border-primary ring-2 ring-primary/20 rotate-1 scale-[1.02] cursor-grabbing bg-white",
    )

    return (
      <article
        data-testid={`pipeline-card-${estimate.id}`}
        data-estimate-id={estimate.id}
        className={cardClasses}
        onClick={handleJobsCardClick}
        onPointerDown={handlePointerDown}
        role="listitem"
        aria-label={`Job for ${clientName}`}
      >
        {/* Top Status Badges & Menu & Drag Handle */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5 min-w-0">
            <span
              className={cn(
                "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold",
                jobStageTone,
              )}
            >
              {fieldJobHeading(jobStageLabel, jobLanguage)}
            </span>
            {estimate.paymentStatus === "paid" ? (
              <span className="inline-flex rounded-full bg-[oklch(0.93_0.05_155)] px-2.5 py-1 text-xs font-semibold text-[oklch(0.32_0.07_155)]">
                Paid
              </span>
            ) : estimate.paymentStatus === "deposit_paid" ? (
              <span className="inline-flex rounded-full bg-[oklch(0.93_0.05_155)] px-2.5 py-1 text-xs font-semibold text-[oklch(0.32_0.07_155)]">
                Deposit Paid
              </span>
            ) : null}
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              data-drag-handle="true"
              aria-label={`Drag ${clientName}`}
              className="flex size-8 shrink-0 cursor-grab items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 active:cursor-grabbing focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
              style={{ touchAction: "none" }}
            >
              <GripVertical className="size-4" />
            </button>
            <div data-interactive="true" onClick={(e) => e.stopPropagation()}>
              <DealMenu estimate={estimate} clientName={clientName} mode="jobs" />
            </div>
          </div>
        </div>

        {/* Customer and Project Name with Prominent Orange Price */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-base font-semibold text-slate-900">
              <Link
                href={limited ? `/work-orders/${estimate.id}` : `/estimates/${estimate.id}`}
                className="hover:underline hover:text-primary"
                onClick={(e) => e.stopPropagation()}
              >
                {clientName}
              </Link>
            </h3>
            <p className="truncate text-sm text-muted-foreground mt-0.5">
              {estimate.title?.trim() || "Painting project"}
            </p>
          </div>
          <div className="shrink-0 text-right">
            <p className="font-display text-2xl leading-none text-price tabular-nums font-bold">
              {money(total)}
            </p>
          </div>
        </div>

        {/* Property Address & Navigate to Jobsite */}
        <div className="flex flex-col gap-1.5" data-interactive="true" onClick={(e) => e.stopPropagation()}>
          <p className="break-words text-sm font-medium text-slate-800">
            {estimate.jobAddress || fieldJobHeading("No address yet", jobLanguage)}
          </p>
          <NavigateToJobsite address={estimate.jobAddress} />
        </div>

        {/* Scheduled Job Date & Assigned Crew */}
        <div
          className="flex flex-col gap-1.5 rounded-xl border border-slate-200/80 bg-slate-50/70 px-3 py-2 text-xs"
          data-interactive="true"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 font-medium text-slate-700" data-testid={`date-status-${estimate.id}`}>
              <CalendarClock className="size-3.5 shrink-0 text-slate-500" />
              {scheduledDate ? (
                <span>{officeOnSite(scheduledDate, jobLanguage)}</span>
              ) : (
                <span className="font-semibold text-amber-700">Date not assigned</span>
              )}
            </span>
            <button
              type="button"
              data-interactive="true"
              data-testid={`schedule-job-${estimate.id}`}
              onClick={() => setScheduleOpen(true)}
              className="shrink-0 font-semibold text-primary hover:underline"
            >
              {scheduledDate || assignedCrew ? "Edit schedule" : "Schedule / Crew"}
            </button>
          </div>
          <p className="inline-flex items-center gap-1.5 text-slate-600" data-testid={`crew-status-${estimate.id}`}>
            <Users className="size-3.5 shrink-0 text-slate-400" />
            <span>Crew: {assignedCrew ? assignedCrew.name : "Unassigned"}</span>
          </p>
        </div>

        <CardNotesSection estimate={estimate} />

        <ScheduleDialog
          open={scheduleOpen}
          kind="job"
          clientName={clientName}
          initialDate={scheduledDate ?? null}
          initialCrewId={order?.assignedCrewId ?? null}
          crews={scope.crews}
          language={jobLanguage}
          onOpenChange={setScheduleOpen}
          onConfirm={(date, _time, _address, crewId) => {
            const nextStatus =
              order?.status === "complete" || order?.status === "in_progress"
                ? order.status
                : date
                  ? "scheduled"
                  : "unscheduled"
            scope.assignWorkOrder(estimate.id, {
              status: nextStatus,
              scheduledStartDate: date || null,
              assignedCrewId: crewId ?? null,
            })
            setScheduleOpen(false)
          }}
        />

        {estimate.paymentStatus === "deposit_paid" &&
        (estimate.depositReceipt?.amount ?? 0) < total ? (
          <Button
            type="button"
            variant="outline"
            className="h-11 w-full rounded-xl text-sm font-semibold"
            data-testid={`mark-paid-${estimate.id}`}
            onClick={(e) => {
              e.stopPropagation()
              scope.markJobPaid(estimate.id)
            }}
          >
            Mark balance paid
          </Button>
        ) : null}

        {/* Relevant Job Actions & Quick Move Selector */}
        <div className="mt-auto flex flex-col gap-2 pt-2 border-t border-slate-100">
          <div className="flex items-center gap-2 w-full">
            <Link
              href={`/work-orders/${estimate.id}`}
              data-interactive="true"
              onClick={(e) => e.stopPropagation()}
              className={cn(buttonVariants({ variant: "default" }), "h-11 flex-1 rounded-xl text-sm font-semibold shadow-sm")}
            >
              Crew sheet
            </Link>
            <Link
              href={`/estimates/${estimate.id}`}
              data-interactive="true"
              onClick={(e) => e.stopPropagation()}
              className={cn(buttonVariants({ variant: "outline" }), "h-11 px-4 rounded-xl text-sm font-medium")}
            >
              Open
            </Link>
          </div>

          {onMoveToColumn && allColumns.length > 0 && jobStage && (
            <div className="relative w-full min-w-0" data-interactive="true" onClick={(e) => e.stopPropagation()}>
              <select
                aria-label={`Move ${clientName} to stage`}
                data-interactive="true"
                value={jobStage}
                onChange={(e) => {
                  e.stopPropagation()
                  if (e.target.value !== jobStage) {
                    onMoveToColumn(e.target.value)
                  }
                }}
                className="h-10 w-full min-w-0 rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 hover:border-slate-300 focus:ring-1 focus:ring-primary focus:outline-none"
              >
                <option value={jobStage} disabled>Move stage...</option>
                {allColumns.map((col) => (
                  <option key={col.id} value={col.id} disabled={col.id === jobStage}>
                    Move to: {col.label}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </article>
    )
  }

  return (
    <article
      data-testid={`pipeline-card-${estimate.id}`}
      className="flex flex-col gap-3 rounded-2xl bg-card p-4 border border-slate-200 bg-white shadow-sm"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate font-medium">
            <Link href={limited ? `/work-orders/${estimate.id}` : `/estimates/${estimate.id}`} className="hover:underline">
              {clientName}
            </Link>
          </h3>
          <p className="truncate text-sm text-muted-foreground">{estimate.title}</p>
        </div>
        <div className="flex flex-col items-end gap-1">
          {estimate.areas.length === 0 && estimate.lineItems.length === 0 ? (
            <p className="text-sm text-muted-foreground">{fieldJobHeading("Not priced", jobLanguage)}</p>
          ) : (
            <p className="font-display text-2xl leading-none text-price tabular-nums">{money(total)}</p>
          )}
          <DealMenu estimate={estimate} clientName={clientName} mode={mode} />
        </div>
      </div>
      {nextStep && salesStage === "estimate_scheduled" ? (
        <Link
          href={`/estimates/${estimate.id}`}
          data-testid={`next-step-${estimate.id}`}
          className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-primary px-3 text-sm font-semibold text-primary-foreground"
          onClick={() => scope.advanceSalesStage(estimate.id)}
        >
          {nextStep}
        </Link>
      ) : null}
      {nextStep && salesStage === "estimate_requested" ? (
        <Link
          href={`/proposal/${estimate.id}`}
          data-testid={`next-step-${estimate.id}`}
          className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-primary px-3 text-sm font-semibold text-primary-foreground"
        >
          {nextStep}
        </Link>
      ) : null}
      {nextStep && salesStage !== "estimate_scheduled" && salesStage !== "estimate_requested" ? (
        <button
          type="button"
          data-testid={`next-step-${estimate.id}`}
          className="h-11 w-full rounded-xl bg-primary text-sm font-semibold text-primary-foreground"
          onClick={() => {
            if (salesStage === "cold") setContactOpen(true)
            else if (salesStage === "warm") setVisitOpen(true)
            else scope.advanceSalesStage(estimate.id)
          }}
        >
          {nextStep}
        </button>
      ) : null}
      {salesStage === "proposal_sent" ? (
        <Link href={`/p/${estimate.publicToken}`} className="text-sm font-medium text-primary" data-testid={`homeowner-link-${estimate.id}`}>
          Homeowner proposal
        </Link>
      ) : null}
      <p className="text-sm">{estimate.jobAddress || fieldJobHeading("No address yet", jobLanguage)}</p>
      <NavigateToJobsite address={estimate.jobAddress} />
      {mode === "sales" && !limited ? (
        <Link href={`/book/${estimate.publicToken}`} className="text-xs font-medium text-primary" data-testid={`book-link-${estimate.id}`}>
          Booking page
        </Link>
      ) : null}
      {visitDay ? (
        <p className="text-sm font-medium" data-testid={`visit-${estimate.id}`}>
          {appointmentLabel(visitDay, estimate.estimateVisitAt)}
        </p>
      ) : null}
      {limited ? null : (
      <>
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
      </>
      )}
      {limited || !lastMessage ? null : (
        <p className="line-clamp-2 text-xs text-muted-foreground" data-testid={`follow-up-last-${estimate.id}`}>
          {lastMessage.delivery === "logged" ? "Logged" : lastMessage.delivery === "sent" ? "Sent" : "Skipped"}:{" "}
          {lastMessage.body}
        </p>
      )}
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
      <CardNotesSection estimate={estimate} />
      <SmartFollowUpBanner estimate={estimate} client={client} />
      <Dialog open={contactOpen} onOpenChange={setContactOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Contacted</DialogTitle>
            <DialogDescription>Write what you talked about. The card then moves to Contacted.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            <Label htmlFor={`contact-${estimate.id}`}>Conversation</Label>
            <textarea
              id={`contact-${estimate.id}`}
              data-testid={`contact-note-${estimate.id}`}
              value={contactNote}
              onChange={(event) => setContactNote(event.target.value)}
              rows={5}
              className="min-h-24 w-full rounded-lg border border-input bg-transparent px-3 py-2 text-base outline-none"
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              className="h-11"
              disabled={!contactNote.trim()}
              onClick={() => {
                scope.addEstimateNote(estimate.id, contactNote)
                scope.advanceSalesStage(estimate.id)
                setContactNote("")
                setContactOpen(false)
              }}
            >
              Save and move to Contacted
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <ScheduleDialog
        open={visitOpen}
        kind="visit"
        clientName={clientName}
        initialDate={estimate.estimateVisitOn ?? null}
        initialTime={localVisitClock(estimate.estimateVisitAt)}
        initialAddress={estimate.jobAddress}
        onOpenChange={setVisitOpen}
        onConfirm={(date, time, address) => {
          if (time) scope.scheduleSalesVisit(estimate.id, date, time, address)
          setVisitOpen(false)
        }}
      />
    </article>
  )
}
