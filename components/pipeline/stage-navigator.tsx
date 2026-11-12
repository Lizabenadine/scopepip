"use client"

import { useEffect, useRef, useState, type MutableRefObject, type RefObject } from "react"
import { useSearchParams } from "next/navigation"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { fieldJobHeading } from "@/lib/field/copy"
import { moneyExact } from "@/lib/format"
import { resolveTargetStageId } from "@/lib/pipeline/targets"
import type { PipelineColumnModel } from "@/lib/pipeline/board"
import { cn } from "@/lib/utils"

/**
 * Syncs `?stage=` query parameters with the mobile single-stage selector,
 * horizontal desktop column scroll, and highlighted desktop column state.
 */
export function usePipelineStageSelection(
  columns: readonly Pick<PipelineColumnModel, "id">[],
  columnRefs: MutableRefObject<Record<string, HTMLElement | null>>,
  scrollContainerRef: RefObject<HTMLDivElement | null>,
) {
  const searchParams = useSearchParams()
  const requestedStage = searchParams.get("stage")
  const [selectedMobileStageId, setSelectedMobileStageId] = useState<string>("")
  const [highlightedStageId, setHighlightedStageId] = useState<string | null>(null)
  const lastScrolledKeyRef = useRef<string | null>(null)

  const matchingStage =
    requestedStage && columns.some((column) => column.id === requestedStage) ? requestedStage : null

  useEffect(() => {
    if (!matchingStage) {
      setHighlightedStageId(null)
      lastScrolledKeyRef.current = null
      return
    }
    setSelectedMobileStageId(matchingStage)
    setHighlightedStageId(matchingStage)

    if (lastScrolledKeyRef.current === matchingStage) return
    const targetEl = columnRefs.current[matchingStage]
    const container = scrollContainerRef.current
    if (!targetEl) return
    lastScrolledKeyRef.current = matchingStage

    if (container && container.scrollWidth > container.clientWidth) {
      const targetLeft = targetEl.offsetLeft - container.offsetLeft - 12
      container.scrollTo({ left: Math.max(0, targetLeft), behavior: "smooth" })
    }
    if (typeof targetEl.scrollIntoView === "function") {
      targetEl.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" })
    }
  }, [matchingStage, columns, columnRefs, scrollContainerRef])

  const activeColumnId = resolveTargetStageId(columns, selectedMobileStageId || matchingStage)
  const activeColumnIndex = Math.max(
    0,
    columns.findIndex((column) => column.id === activeColumnId),
  )

  return {
    activeColumnId,
    activeColumnIndex,
    highlightedStageId,
    setActiveMobileStageId: (columnId: string) => {
      setSelectedMobileStageId(columnId)
      setHighlightedStageId(columnId)
    },
  }
}

export function MobileStageNavigator({
  columns,
  activeColumnId,
  activeColumnIndex,
  onSelect,
  language,
  ariaLabel,
  hideTotal = false,
}: {
  columns: readonly PipelineColumnModel[]
  activeColumnId: string
  activeColumnIndex: number
  onSelect: (columnId: string) => void
  language: "en" | "es"
  ariaLabel: string
  hideTotal?: boolean
}) {
  const activeColumn = columns[activeColumnIndex] ?? columns[0]

  return (
    <div className="flex flex-col gap-2 md:hidden" data-testid="mobile-stage-nav">
      <div className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 shadow-xs">
        <button
          type="button"
          data-testid="mobile-stage-prev"
          aria-label="Previous pipeline stage"
          disabled={activeColumnIndex <= 0}
          onClick={() => {
            const prev = columns[activeColumnIndex - 1]
            if (prev) onSelect(prev.id)
          }}
          className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 disabled:opacity-35"
        >
          <ChevronLeft className="size-4" />
        </button>
        <div className="min-w-0 flex-1 text-center">
          <p className="truncate text-xs font-bold uppercase tracking-wider text-slate-800">
            {activeColumn ? fieldJobHeading(activeColumn.label, language) : ""}
          </p>
          <p className="text-[11px] text-slate-500 tabular-nums">
            {activeColumn
              ? hideTotal
                ? `${activeColumn.cards.length}`
                : `${activeColumn.cards.length} · ${moneyExact(activeColumn.total)}`
              : ""}
          </p>
        </div>
        <button
          type="button"
          data-testid="mobile-stage-next"
          aria-label="Next pipeline stage"
          disabled={activeColumnIndex >= columns.length - 1}
          onClick={() => {
            const next = columns[activeColumnIndex + 1]
            if (next) onSelect(next.id)
          }}
          className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 disabled:opacity-35"
        >
          <ChevronRight className="size-4" />
        </button>
      </div>

      <div role="tablist" aria-label={ariaLabel} className="flex gap-1.5 overflow-x-auto pb-1">
        {columns.map((column) => {
          const selected = column.id === activeColumnId
          return (
            <button
              key={column.id}
              type="button"
              role="tab"
              aria-selected={selected}
              data-testid={`mobile-stage-tab-${column.id}`}
              onClick={() => onSelect(column.id)}
              className={cn(
                "shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1",
                selected
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
              )}
            >
              {fieldJobHeading(column.label, language)}
              <span className="ml-1.5 tabular-nums opacity-80">{column.cards.length}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
