"use client"

import Link from "next/link"
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react"
import { ChevronLeft, ChevronRight, Plus } from "lucide-react"
import { SalesDealCard } from "@/components/pipeline/sales-deal-card"
import { NewLeadButton, newLeadButtonClass } from "@/components/pipeline/new-lead-dialog"
import { Button, buttonVariants } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useFieldLanguage } from "@/hooks/use-field-language"
import { SCOPE_VERSION } from "@/lib/data/seed"
import { flushBook, useScope } from "@/lib/data/store"
import { fieldJobEmpty, fieldJobHeading } from "@/lib/field/copy"
import { moneyExact } from "@/lib/format"
import { officeCount, officeLabel, officeSalesNote } from "@/lib/office/dashboard-copy"
import {
  boardColumns,
  buildPipeline,
  DATE_RANGES,
  LEAD_SOURCE_LABELS,
  OPEN_FILTERS,
  salespersonOptions,
  type BoardFilters,
  type PipelineCardModel,
  type PipelineColumnModel,
} from "@/lib/pipeline/board"
import { LEAD_SOURCES, type Estimate } from "@/lib/types"
import { cn } from "@/lib/utils"

function todayIso(): string {
  const now = new Date()
  const month = `${now.getMonth() + 1}`.padStart(2, "0")
  const day = `${now.getDate()}`.padStart(2, "0")
  return `${now.getFullYear()}-${month}-${day}`
}

interface ActiveDrag {
  card: PipelineCardModel
  estimate: Estimate
  sourceColumnId: string
  initialPointer: { x: number; y: number }
  pointerOffset: { x: number; y: number }
  initialWidth: number
}

export function SalesPipelineBoard() {
  const scope = useScope()
  const { language } = useFieldLanguage()
  const say = (text: string) => officeLabel(text, language)

  const [filters, setFilters] = useState<BoardFilters>(OPEN_FILTERS)
  const [renaming, setRenaming] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState("")
  const [newLabel, setNewLabel] = useState("")
  const [newAfter, setNewAfter] = useState("")
  const [columnError, setColumnError] = useState("")
  const [optimisticOverrides, setOptimisticOverrides] = useState<Record<string, string>>({})
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [activeMobileColumnId, setActiveMobileColumnId] = useState<string>("")

  // Drag and drop state
  const [activeDrag, setActiveDrag] = useState<ActiveDrag | null>(null)
  const [pointerPos, setPointerPos] = useState<{ x: number; y: number } | null>(null)
  const [hasMoved, setHasMoved] = useState(false)
  const [hoveredColumnId, setHoveredColumnId] = useState<string | null>(null)

  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const columnRefs = useRef<Record<string, HTMLElement | null>>({})
  const scrollRafRef = useRef<number | null>(null)
  const activeDragRef = useRef<ActiveDrag | null>(null)
  activeDragRef.current = activeDrag
  const hoveredColRef = useRef<string | null>(null)
  hoveredColRef.current = hoveredColumnId
  const hasMovedRef = useRef(false)

  const salespeople = useMemo(
    () => salespersonOptions(scope.estimates),
    [scope.estimates],
  )

  // Raw columns from store and filters
  const rawColumns = useMemo(() => {
    if (!scope.ready) return []
    return buildPipeline(
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
        customColumns: scope.customColumns,
        columnLabels: scope.columnLabels,
      },
      "sales",
      filters,
      todayIso(),
    )
  }, [scope, filters])

  // Clear obsolete optimistic overrides when store catches up
  useEffect(() => {
    if (Object.keys(optimisticOverrides).length === 0) return
    const nextOverrides = { ...optimisticOverrides }
    let changed = false

    for (const [estimateId, overrideColumnId] of Object.entries(optimisticOverrides)) {
      const estimate = scope.estimates.find((item) => item.id === estimateId)
      if (estimate) {
        const actualCol = estimate.boardColumnId || estimate.salesStage
        if (actualCol === overrideColumnId) {
          delete nextOverrides[estimateId]
          changed = true
        }
      }
    }

    if (changed) {
      setOptimisticOverrides(nextOverrides)
    }
  }, [scope.estimates, optimisticOverrides])

  // Columns with optimistic overrides applied
  const columns: PipelineColumnModel[] = useMemo(() => {
    if (Object.keys(optimisticOverrides).length === 0) return rawColumns

    // Collect all cards across all columns
    const allCards: PipelineCardModel[] = []
    for (const col of rawColumns) {
      for (const card of col.cards) {
        const override = optimisticOverrides[card.estimateId]
        allCards.push({
          ...card,
          column: override ?? card.column,
        })
      }
    }

    // Distribute cards into their columns
    return rawColumns.map((col) => {
      const colCards = allCards.filter((card) => card.column === col.id)
      const total = Math.round(colCards.reduce((sum, card) => sum + card.total, 0) * 100) / 100
      return {
        ...col,
        cards: colCards,
        total,
      }
    })
  }, [rawColumns, optimisticOverrides])

  const allColumnOptions = useMemo(() => {
    return columns.map((col) => ({ id: col.id, label: col.label }))
  }, [columns])

  // Move card handler with instant optimistic update and rollback
  const handleMoveCard = useCallback(
    async (estimateId: string, targetColumnId: string) => {
      const originalEstimate = scope.estimates.find((item) => item.id === estimateId)
      if (!originalEstimate) return

      const sourceCol = originalEstimate.boardColumnId || originalEstimate.salesStage || "cold"
      if (sourceCol === targetColumnId) return

      // Optimistic update
      setOptimisticOverrides((prev) => ({
        ...prev,
        [estimateId]: targetColumnId,
      }))
      setErrorMessage(null)

      try {
        scope.placeOnColumn(estimateId, targetColumnId)
        await flushBook()
      } catch {
        // Rollback on failure
        setOptimisticOverrides((prev) => {
          const next = { ...prev }
          delete next[estimateId]
          return next
        })
        setErrorMessage("Could not move lead to new stage. Reverted changes.")
      }
    },
    [scope],
  )

  // Auto-scroll loop while dragging near edges
  const startEdgeAutoScroll = useCallback((pointerX: number) => {
    const container = scrollContainerRef.current
    if (!container) return

    const rect = container.getBoundingClientRect()
    const edgeThreshold = 90
    const maxSpeed = 16

    let speed = 0
    if (pointerX < rect.left + edgeThreshold) {
      const factor = Math.max(0, (rect.left + edgeThreshold - pointerX) / edgeThreshold)
      speed = -Math.min(maxSpeed, Math.max(3, factor * maxSpeed))
    } else if (pointerX > rect.right - edgeThreshold) {
      const factor = Math.max(0, (pointerX - (rect.right - edgeThreshold)) / edgeThreshold)
      speed = Math.min(maxSpeed, Math.max(3, factor * maxSpeed))
    }

    if (scrollRafRef.current) {
      cancelAnimationFrame(scrollRafRef.current)
      scrollRafRef.current = null
    }

    if (speed !== 0) {
      const step = () => {
        if (!activeDragRef.current || !scrollContainerRef.current) return
        scrollContainerRef.current.scrollLeft += speed
        scrollRafRef.current = requestAnimationFrame(step)
      }
      scrollRafRef.current = requestAnimationFrame(step)
    }
  }, [])

  const stopEdgeAutoScroll = useCallback(() => {
    if (scrollRafRef.current) {
      cancelAnimationFrame(scrollRafRef.current)
      scrollRafRef.current = null
    }
  }, [])

  // Global window pointermove and pointerup listeners during active drag
  useEffect(() => {
    if (!activeDrag) return

    const handlePointerMove = (e: globalThis.PointerEvent) => {
      setPointerPos({ x: e.clientX, y: e.clientY })

      const drag = activeDragRef.current
      if (!drag) return

      const dist = Math.hypot(e.clientX - drag.initialPointer.x, e.clientY - drag.initialPointer.y)
      if (dist > 5) {
        hasMovedRef.current = true
        setHasMoved(true)
      }

      // Check which column is hovered
      let matchedColId: string | null = null
      for (const [colId, element] of Object.entries(columnRefs.current)) {
        if (!element) continue
        const rect = element.getBoundingClientRect()
        if (
          e.clientX >= rect.left &&
          e.clientX <= rect.right &&
          e.clientY >= rect.top &&
          e.clientY <= rect.bottom
        ) {
          matchedColId = colId
          break
        }
      }
      setHoveredColumnId(matchedColId)

      // Auto scroll check
      startEdgeAutoScroll(e.clientX)
    }

    const handlePointerUp = () => {
      stopEdgeAutoScroll()

      const currentDrag = activeDragRef.current
      const currentTarget = hoveredColRef.current
      const didMove = hasMovedRef.current

      if (didMove) {
        // Prevent accidental synthetic click navigation on pointerup
        const cancelClick = (clickEvent: globalThis.MouseEvent) => {
          clickEvent.stopPropagation()
          clickEvent.preventDefault()
        }
        window.addEventListener("click", cancelClick, { capture: true, once: true })
      }

      if (currentDrag && currentTarget && currentTarget !== currentDrag.sourceColumnId) {
        void handleMoveCard(currentDrag.card.estimateId, currentTarget)
      }

      setActiveDrag(null)
      setPointerPos(null)
      hasMovedRef.current = false
      setHasMoved(false)
      setHoveredColumnId(null)
    }

    window.addEventListener("pointermove", handlePointerMove)
    window.addEventListener("pointerup", handlePointerUp)
    window.addEventListener("pointercancel", handlePointerUp)

    return () => {
      stopEdgeAutoScroll()
      window.removeEventListener("pointermove", handlePointerMove)
      window.removeEventListener("pointerup", handlePointerUp)
      window.removeEventListener("pointercancel", handlePointerUp)
    }
  }, [activeDrag, handleMoveCard, startEdgeAutoScroll, stopEdgeAutoScroll])

  // Initiate drag from card handle or card surface
  const handleStartDrag = useCallback(
    (
      card: PipelineCardModel,
      estimate: Estimate,
      sourceColumnId: string,
      e: ReactPointerEvent<HTMLElement>,
    ) => {
      e.preventDefault()
      const targetCard = (e.currentTarget.closest("article") || e.currentTarget) as HTMLElement
      const rect = targetCard.getBoundingClientRect()

      hasMovedRef.current = false
      setActiveDrag({
        card,
        estimate,
        sourceColumnId,
        initialPointer: { x: e.clientX, y: e.clientY },
        pointerOffset: { x: e.clientX - rect.left, y: e.clientY - rect.top },
        initialWidth: rect.width,
      })
      setPointerPos({ x: e.clientX, y: e.clientY })
      setHasMoved(false)
      setHoveredColumnId(sourceColumnId)
    },
    [],
  )

  const scrollHorizontally = (offset: number) => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: offset, behavior: "smooth" })
    }
  }

  if (!scope.ready) {
    return (
      <div className="grid gap-3" aria-hidden>
        <div className="h-11 animate-pulse rounded-lg bg-muted" />
        <div className="h-64 animate-pulse rounded-2xl bg-muted" />
      </div>
    )
  }

  const title = fieldJobHeading("Sales Pipeline", language)
  const totalLeads = columns.reduce((sum, col) => sum + col.cards.length, 0)
  const totalPipelineDollar = columns.reduce((sum, col) => sum + col.total, 0)
  const activeColumnIndex = Math.max(
    0,
    columns.findIndex((col) => col.id === activeMobileColumnId),
  )
  const activeColumn = columns[activeColumnIndex] ?? columns[0]
  const activeColumnId = activeColumn?.id ?? ""

  return (
    <div className="flex min-w-0 flex-col gap-4 overflow-x-hidden" data-testid="sales-pipeline">
      {/* Tab Navigation */}
      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Pipeline">
        <Link
          href="/sales-pipeline"
          role="tab"
          aria-selected={true}
          data-testid="tab-sales"
          className="rounded-full bg-primary px-3 py-2 text-sm font-medium text-primary-foreground"
        >
          {fieldJobHeading("Sales Pipeline", language)}
        </Link>
        <Link
          href="/dispatch"
          role="tab"
          aria-selected={false}
          data-testid="tab-jobs"
          className="rounded-full bg-muted px-3 py-2 text-sm font-medium text-foreground hover:bg-slate-200"
        >
          {fieldJobHeading("Jobs Pipeline", language)}
        </Link>
      </div>

      {/* Top Header & Metrics */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">{title}</h1>
          <p className="text-sm text-muted-foreground">
            {officeCount(totalLeads, language)}
            {` · ${moneyExact(totalPipelineDollar)} Total Value`}
            {officeSalesNote(language)}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/follow-ups" className="text-sm font-medium text-primary hover:underline">
            {say("Follow-ups")}
          </Link>
        </div>
      </div>

      {/* Filter and Action Bar */}
      <div className="flex flex-wrap items-center gap-2">
        <NewLeadButton label={say("+ New Lead")} className={newLeadButtonClass()} />
        <Link
          href="/estimates/new"
          data-testid="new-proposal"
          className={cn(buttonVariants({ variant: "outline" }), "h-9 border-slate-300 bg-white font-medium shadow-xs")}
        >
          {say("+ New Proposal")}
        </Link>

        <FilterSelect
          label={say("Lead Source")}
          value={filters.leadSource}
          onChange={(leadSource) =>
            setFilters((current) => ({ ...current, leadSource: leadSource as BoardFilters["leadSource"] }))
          }
        >
          <option value="all">{say("All sources")}</option>
          {LEAD_SOURCES.map((source) => (
            <option key={source} value={source}>
              {LEAD_SOURCE_LABELS[source]}
            </option>
          ))}
        </FilterSelect>

        <FilterSelect
          label={say("Date Range")}
          value={filters.dateRange}
          onChange={(dateRange) =>
            setFilters((current) => ({ ...current, dateRange: dateRange as BoardFilters["dateRange"] }))
          }
        >
          {DATE_RANGES.map((range) => (
            <option key={range.id} value={range.id}>
              {say(range.label)}
            </option>
          ))}
        </FilterSelect>

        <FilterSelect
          label={say("Salesperson")}
          value={filters.salesperson}
          onChange={(salesperson) => setFilters((current) => ({ ...current, salesperson }))}
        >
          <option value="all">{say("Everyone")}</option>
          {salespeople.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </FilterSelect>

        {/* Manual Horizontal Scroll Quick Buttons */}
        <div className="ml-auto hidden md:flex items-center gap-1">
          <button
            type="button"
            onClick={() => scrollHorizontally(-320)}
            aria-label="Scroll pipeline left"
            className="flex size-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900 shadow-xs"
          >
            <ChevronLeft className="size-4" />
          </button>
          <button
            type="button"
            onClick={() => scrollHorizontally(320)}
            aria-label="Scroll pipeline right"
            className="flex size-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900 shadow-xs"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>
      </div>

      {/* Error notification if move failed */}
      {errorMessage && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive font-medium">
          {errorMessage}
        </div>
      )}

      {/* Mobile Single-Stage Horizontal Navigation */}
      <div className="flex flex-col gap-2 md:hidden" data-testid="mobile-stage-nav">
        <div className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 shadow-xs">
          <button
            type="button"
            data-testid="mobile-stage-prev"
            aria-label="Previous pipeline stage"
            disabled={activeColumnIndex <= 0}
            onClick={() => {
              const prev = columns[activeColumnIndex - 1]
              if (prev) setActiveMobileColumnId(prev.id)
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
              {activeColumn ? `${activeColumn.cards.length} · ${moneyExact(activeColumn.total)}` : ""}
            </p>
          </div>
          <button
            type="button"
            data-testid="mobile-stage-next"
            aria-label="Next pipeline stage"
            disabled={activeColumnIndex >= columns.length - 1}
            onClick={() => {
              const next = columns[activeColumnIndex + 1]
              if (next) setActiveMobileColumnId(next.id)
            }}
            className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 disabled:opacity-35"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>

        <div
          role="tablist"
          aria-label="Sales pipeline stages"
          className="flex gap-1.5 overflow-x-auto pb-1"
        >
          {columns.map((column) => {
            const selected = column.id === activeColumnId
            return (
              <button
                key={column.id}
                type="button"
                role="tab"
                aria-selected={selected}
                data-testid={`mobile-stage-tab-${column.id}`}
                onClick={() => setActiveMobileColumnId(column.id)}
                className={cn(
                  "shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors",
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

      {/* Kanban Board Container (single stage on mobile, full Kanban columns on md+) */}
      <div
        ref={scrollContainerRef}
        className={cn(
          "flex flex-col gap-3 md:flex-row md:items-start md:gap-3.5 md:overflow-x-auto pb-6 pt-1 scroll-smooth focus:outline-none",
          activeDrag && "select-none",
        )}
        tabIndex={0}
        aria-label="Sales pipeline stages board"
      >
        {columns.map((column) => {
          const isHoverTarget = activeDrag && hasMoved && hoveredColumnId === column.id
          const isSourceColumn = activeDrag?.sourceColumnId === column.id
          const isMobileActive = column.id === activeColumnId

          return (
            <section
              key={column.id}
              ref={(el) => {
                columnRefs.current[column.id] = el
              }}
              data-testid={`column-${column.id}`}
              data-column-id={column.id}
              className={cn(
                "w-full min-w-0 flex-col gap-2.5 rounded-2xl bg-slate-100/75 p-3 border transition-colors duration-150 md:flex md:w-76 md:shrink-0",
                isMobileActive ? "flex" : "hidden",
                isHoverTarget ? "border-primary/50 bg-primary/[0.04] ring-2 ring-primary/20" : "border-slate-200/80",
              )}
            >
              {/* Stage Totals at the TOP of each column */}
              <header className="flex flex-col gap-1.5 px-0.5 pb-2 border-b border-slate-200/70">
                <div className="flex items-center justify-between gap-2">
                  {renaming === column.id ? (
                    <form
                      className="flex min-w-0 flex-1 gap-1"
                      onSubmit={(e) => {
                        e.preventDefault()
                        if (!renameValue.trim()) return
                        scope.renameBoardColumn(column.id, renameValue)
                        setRenaming(null)
                      }}
                    >
                      <Input
                        value={renameValue}
                        aria-label={`Rename ${column.label}`}
                        className="h-7 text-xs"
                        onValueChange={setRenameValue}
                      />
                      <Button type="submit" className="h-7 px-2 text-xs">
                        Save
                      </Button>
                    </form>
                  ) : (
                    <div className="flex items-center gap-2 min-w-0">
                      <h2
                        className="text-xs font-bold tracking-wider text-slate-700 uppercase truncate"
                        data-testid={`column-label-${column.id}`}
                      >
                        {fieldJobHeading(column.label, language)}
                      </h2>
                      <span className="inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-slate-200 text-[11px] font-bold tabular-nums text-slate-700">
                        {column.cards.length}
                      </span>
                    </div>
                  )}

                  {/* Rename / Remove Actions for Custom Columns */}
                  {renaming !== column.id && (
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        className="text-[11px] font-medium text-slate-500 hover:text-primary transition-colors"
                        data-testid={`rename-column-${column.id}`}
                        onClick={() => {
                          setRenaming(column.id)
                          setRenameValue(column.label)
                        }}
                      >
                        {say("Rename")}
                      </button>
                      {column.custom && (
                        <button
                          type="button"
                          className="text-[11px] font-medium text-destructive hover:underline"
                          data-testid={`remove-column-${column.id}`}
                          onClick={() => scope.removeCustomColumn(column.id)}
                        >
                          {say("Remove")}
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Prominent Stage Dollar Total at the top */}
                <div className="flex items-baseline justify-between pt-0.5">
                  <span className="text-[11px] font-medium uppercase tracking-wider text-slate-500">Total</span>
                  <span className="font-display text-sm font-bold text-price tabular-nums">
                    {moneyExact(column.total)}
                  </span>
                </div>
              </header>

              {/* Cards List / Drop Target */}
              <div
                className={cn(
                  "flex min-h-[120px] flex-1 flex-col gap-2.5 rounded-xl transition-colors",
                  isHoverTarget && !isSourceColumn && "bg-primary/[0.02]",
                )}
                role="list"
                aria-label={`${column.label} leads`}
              >
                {column.cards.length === 0 ? (
                  <p className="flex flex-1 items-center justify-center rounded-xl border border-dashed border-slate-200 bg-white/50 px-3 py-8 text-center text-xs text-slate-400">
                    {fieldJobEmpty(column.label, column.empty, language)}
                  </p>
                ) : (
                  column.cards.map((card) => {
                    const estimate = scope.estimates.find((item) => item.id === card.estimateId)
                    if (!estimate) return null
                    const isBeingDragged = activeDrag?.card.estimateId === card.estimateId && hasMoved

                    return (
                      <SalesDealCard
                        key={card.estimateId}
                        card={card}
                        estimate={estimate}
                        allColumns={allColumnOptions}
                        isDragging={isBeingDragged}
                        onDragStart={(e) => handleStartDrag(card, estimate, column.id, e)}
                        onMoveToColumn={(targetCol) => void handleMoveCard(card.estimateId, targetCol)}
                      />
                    )
                  })
                )}

                {/* Drop indicator if dragging over an empty zone */}
                {isHoverTarget && !isSourceColumn && (
                  <div className="rounded-xl border-2 border-dashed border-primary/40 bg-primary/[0.04] p-3 text-center text-xs font-medium text-primary">
                    Drop to move to {column.label}
                  </div>
                )}
              </div>

              {/* Hidden / Backwards-compatible footer element to satisfy any existing test selectors */}
              <div
                data-testid={`column-footer-${column.id}`}
                className="sr-only"
                aria-hidden="true"
              >
                {moneyExact(column.total)}
              </div>
            </section>
          )
        })}

        {/* Add Column Form */}
        <form
          className="flex w-full shrink-0 flex-col gap-2 self-start rounded-2xl border border-dashed border-slate-300 bg-white/40 p-3 shadow-xs md:w-76"
          data-testid="add-column"
          onSubmit={(e) => {
            e.preventDefault()
            const result = scope.addCustomColumn("sales", newLabel, newAfter)
            if (result.ok) {
              setNewLabel("")
              setNewAfter("")
              setColumnError("")
            } else {
              setColumnError(result.reason)
            }
          }}
        >
          <div className="flex items-center gap-1.5 text-xs font-bold tracking-wider text-slate-700 uppercase">
            <Plus className="size-3.5" />
            <span>Add a column</span>
          </div>
          <Input
            value={newLabel}
            aria-label="New column name"
            placeholder="Column name"
            className="h-8 text-xs bg-white"
            data-testid="new-column-name"
            onValueChange={setNewLabel}
          />
          <select
            aria-label="Place the column after"
            value={newAfter}
            data-testid="new-column-after"
            className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-xs font-medium text-slate-700"
            onChange={(e) => setNewAfter(e.target.value)}
          >
            <option value="">At the end</option>
            {boardColumns(scope, "sales")
              .filter((column) => !column.custom)
              .map((column) => (
                <option key={column.id} value={column.id}>
                  After {column.label}
                </option>
              ))}
          </select>
          <Button type="submit" className="h-8 text-xs font-medium" data-testid="add-column-submit">
            Add column
          </Button>
          {columnError && (
            <p className="text-xs text-destructive" data-testid="add-column-error">
              {columnError}
            </p>
          )}
        </form>
      </div>

      {/* Floating Drag Overlay */}
      {activeDrag && hasMoved && pointerPos && (
        <div
          className="pointer-events-none fixed z-50 select-none"
          style={{
            left: `${pointerPos.x - activeDrag.pointerOffset.x}px`,
            top: `${pointerPos.y - activeDrag.pointerOffset.y}px`,
            width: `${activeDrag.initialWidth}px`,
          }}
        >
          <SalesDealCard
            card={activeDrag.card}
            estimate={activeDrag.estimate}
            allColumns={allColumnOptions}
            isOverlay={true}
          />
        </div>
      )}
    </div>
  )
}

function FilterSelect({
  label,
  value,
  onChange,
  children,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  children: ReactNode
}) {
  return (
    <label className="flex min-w-0 basis-full items-center gap-1.5 text-xs sm:basis-auto font-medium text-slate-600">
      <span className="shrink-0">{label}</span>
      <select
        aria-label={label}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-9 min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-800 shadow-xs hover:border-slate-300 focus:outline-none focus:ring-1 focus:ring-primary sm:h-9"
      >
        {children}
      </select>
    </label>
  )
}
