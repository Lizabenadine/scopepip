"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { type MouseEvent, type PointerEvent } from "react"
import { Calendar, ChevronRight, Eye, FileText, GripVertical, MessageSquare, PhoneCall } from "lucide-react"
import { DealMenu } from "@/components/pipeline/deal-menu"
import { Badge } from "@/components/ui/badge"
import { appointmentLabel } from "@/lib/appointments/visit"
import { useClientNow } from "@/lib/browser/client-env"
import { SCOPE_VERSION } from "@/lib/data/seed"
import { useScope } from "@/lib/data/store"
import { describeFollowUp, visitDayOf } from "@/lib/follow-ups/schedule"
import { money } from "@/lib/format"
import { latestInbound } from "@/lib/messages/thread"
import {
  LEAD_SOURCE_LABELS,
  nextSalesStage,
  SALES_COLUMNS,
  salesStageOf,
  type PipelineCardModel,
} from "@/lib/pipeline/board"
import { latestProposalOpen } from "@/lib/proposals/opens"
import type { Estimate } from "@/lib/types"
import { cn } from "@/lib/utils"

export interface SalesDealCardProps {
  card: PipelineCardModel
  estimate: Estimate
  allColumns: { id: string; label: string }[]
  isDragging?: boolean
  isOverlay?: boolean
  onDragStart?: (event: PointerEvent<HTMLElement>) => void
  onMoveToColumn?: (targetColumnId: string) => void
}

export function SalesDealCard({
  card,
  estimate,
  allColumns,
  isDragging = false,
  isOverlay = false,
  onDragStart,
  onMoveToColumn,
}: SalesDealCardProps) {
  const router = useRouter()
  const scope = useScope()
  const now = useClientNow() ?? 0
  const limited = scope.session?.role === "project_manager"

  const source = estimate.leadSource
  const tags = estimate.tags ?? []
  const visitDay = visitDayOf(estimate)
  const proposalOpen = latestProposalOpen(estimate)
  const client = scope.clients.find((item) => item.id === estimate.clientId)
  const reply = latestInbound(client?.messages)
  const replyOnDeal = reply?.estimateId === estimate.id ? reply : null

  const salesStage = salesStageOf(estimate)
  const nextSales = salesStage ? nextSalesStage(salesStage) : null
  const nextStepLabel = nextSales
    ? scope.columnLabels?.[nextSales]?.trim() || SALES_COLUMNS.find((col) => col.id === nextSales)?.label
    : null

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

  const detailHref = limited ? `/work-orders/${estimate.id}` : `/estimates/${estimate.id}`

  const handleCardClick = (e: MouseEvent<HTMLDivElement>) => {
    // Only navigate if click wasn't on an interactive child element
    const target = e.target as HTMLElement
    if (target.closest("button, a, input, select, textarea, [data-interactive='true']")) {
      return
    }
    if (isDragging) return
    router.push(detailHref)
  }

  const handlePointerDown = (e: PointerEvent<HTMLElement>) => {
    // If clicking an interactive button or input (except the drag handle), don't start dragging
    const target = e.target as HTMLElement
    if (target.closest("button:not([data-drag-handle]), a, input, select, textarea, [data-interactive='true']:not([data-drag-handle])")) {
      return
    }
    onDragStart?.(e)
  }

  // Determine key status pill to display concisely
  const statusInfo = (() => {
    if (visitDay) {
      return {
        icon: <Calendar className="size-3 shrink-0 text-amber-600" />,
        text: appointmentLabel(visitDay, estimate.estimateVisitAt),
        tone: "bg-amber-50 text-amber-800 border-amber-200",
      }
    }
    if (replyOnDeal?.body.trim()) {
      return {
        icon: <MessageSquare className="size-3 shrink-0 text-emerald-600" />,
        text: "Customer replied",
        tone: "bg-emerald-50 text-emerald-800 border-emerald-200",
      }
    }
    if (salesStage === "proposal_sent") {
      if (proposalOpen) {
        return {
          icon: <Eye className="size-3 shrink-0 text-indigo-600" />,
          text: proposalOpen.kind === "revisit" ? "Viewed again" : "Proposal viewed",
          tone: "bg-indigo-50 text-indigo-800 border-indigo-200",
        }
      }
      return {
        icon: <FileText className="size-3 shrink-0 text-blue-600" />,
        text: "Proposal sent",
        tone: "bg-blue-50 text-blue-800 border-blue-200",
      }
    }
    if (followUpStatus && !followUpStatus.includes("Stopped")) {
      return {
        icon: <PhoneCall className="size-3 shrink-0 text-sky-600" />,
        text: followUpStatus,
        tone: "bg-sky-50 text-sky-800 border-sky-200",
      }
    }
    if (source) {
      return {
        icon: null,
        text: LEAD_SOURCE_LABELS[source],
        tone: "bg-slate-100 text-slate-700 border-slate-200",
      }
    }
    return null
  })()

  const cardClasses = cn(
    "group relative flex flex-col gap-2 rounded-xl border border-slate-200/90 bg-white p-3 shadow-xs select-none transition-all duration-150",
    !isOverlay && "hover:border-slate-300 hover:shadow-md cursor-pointer",
    isDragging && "opacity-30 border-2 border-dashed border-primary/40 bg-primary/[0.03]",
    isOverlay && "shadow-2xl border-primary/50 ring-2 ring-primary/20 rotate-1 scale-[1.02] cursor-grabbing",
  )

  return (
    <article
      data-testid={`pipeline-card-${estimate.id}`}
      data-estimate-id={estimate.id}
      className={cardClasses}
      onClick={handleCardClick}
      onPointerDown={handlePointerDown}
      role="listitem"
      aria-label={`Lead for ${card.clientName}`}
    >
      {/* Top Header: Drag handle, Client Name, and Value */}
      <div className="flex items-start gap-2">
        <button
          type="button"
          data-drag-handle="true"
          aria-label={`Drag ${card.clientName}`}
          className="mt-0.5 -ml-1 flex size-6 shrink-0 cursor-grab items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700 active:cursor-grabbing focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
          style={{ touchAction: "none" }}
        >
          <GripVertical className="size-3.5" />
        </button>

        <div className="min-w-0 flex-1">
          <Link
            href={detailHref}
            className="block truncate text-sm font-semibold text-slate-900 group-hover:text-primary hover:underline"
            onClick={(e) => e.stopPropagation()}
          >
            {card.clientName}
          </Link>
          <p className="truncate text-xs text-slate-500">
            {estimate.title?.trim() || estimate.jobAddress || "Painting project"}
          </p>
        </div>

        <div className="shrink-0 text-right">
          {card.total > 0 ? (
            <span className="font-display text-sm font-bold tracking-tight text-price tabular-nums">
              {money(card.total)}
            </span>
          ) : (
            <span className="text-[11px] font-medium text-slate-400">Not priced</span>
          )}
        </div>
      </div>

      {/* Middle Row: Status Badge & Tags */}
      {(statusInfo || tags.length > 0) && (
        <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
          {statusInfo && (
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[11px] font-medium tracking-tight",
                statusInfo.tone,
              )}
            >
              {statusInfo.icon}
              <span className="truncate max-w-[170px]">{statusInfo.text}</span>
            </span>
          )}

          {tags.slice(0, 2).map((tag) => (
            <Badge key={tag} variant="outline" className="text-[10px] px-1.5 py-0 h-4.5 bg-slate-50 text-slate-600 border-slate-200">
              {tag}
            </Badge>
          ))}
          {tags.length > 2 && (
            <span className="text-[10px] text-slate-400">+{tags.length - 2}</span>
          )}
        </div>
      )}

      {/* Bottom Footer: Quick Actions, Keyboard Accessibility & Deal Menu */}
      <div className="flex items-center justify-between border-t border-slate-100 pt-2 mt-0.5">
        <div className="flex items-center gap-1">
          {/* Quick advance button if next step is available */}
          {nextStepLabel && onMoveToColumn && nextSales && (
            <button
              type="button"
              data-interactive="true"
              onClick={(e) => {
                e.stopPropagation()
                onMoveToColumn(nextSales)
              }}
              title={`Advance to ${nextStepLabel}`}
              className="inline-flex h-6 items-center gap-1 rounded-md bg-slate-100 hover:bg-primary/10 hover:text-primary px-2 text-[11px] font-medium text-slate-700 transition-colors"
            >
              <span>{nextStepLabel}</span>
              <ChevronRight className="size-3 shrink-0" />
            </button>
          )}

          {/* Accessible Move Dropdown for Keyboard/Screenreader navigation */}
          {onMoveToColumn && (
            <div className="relative">
              <select
                aria-label={`Move ${card.clientName} to stage`}
                data-interactive="true"
                value={card.column}
                onChange={(e) => {
                  e.stopPropagation()
                  if (e.target.value !== card.column) {
                    onMoveToColumn(e.target.value)
                  }
                }}
                onClick={(e) => e.stopPropagation()}
                className="h-6 rounded-md border border-slate-200 bg-white px-1.5 text-[11px] font-medium text-slate-600 hover:border-slate-300 focus:ring-1 focus:ring-primary focus:outline-none"
              >
                <option value={card.column} disabled>Move...</option>
                {allColumns.map((col) => (
                  <option key={col.id} value={col.id} disabled={col.id === card.column}>
                    {col.label}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div data-interactive="true" onClick={(e) => e.stopPropagation()}>
          <DealMenu estimate={estimate} clientName={card.clientName} mode="sales" />
        </div>
      </div>
    </article>
  )
}
