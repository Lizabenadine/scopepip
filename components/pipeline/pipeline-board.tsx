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
import { ChevronLeft, ChevronRight } from "lucide-react"
import { DispatchBoard } from "@/components/dispatch/dispatch-board"
import { useFieldLanguage } from "@/hooks/use-field-language"
import { fieldJobEmpty, fieldJobHeading } from "@/lib/field/copy"
import { officeCount, officeLabel, officeSalesNote } from "@/lib/office/dashboard-copy"
import { DealCard } from "@/components/pipeline/deal-card"
import { NewLeadButton, newLeadButtonClass } from "@/components/pipeline/new-lead-dialog"
import { SalesPipelineBoard } from "@/components/pipeline/sales-pipeline-board"
import { Button, buttonVariants } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { SCOPE_VERSION } from "@/lib/data/seed"
import { flushBook, useScope } from "@/lib/data/store"
import { moneyExact } from "@/lib/format"
import {
  boardColumns,
  buildPipeline,
  DATE_RANGES,
  jobStageOf,
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

export function PipelineBoard({ kind }: { kind: "sales" | "jobs" }) {
  if (kind === "sales") {
    return <SalesPipelineBoard />
  }
  return <JobsPipelineBoard kind={kind} />
}

interface ActiveDrag {
  card: PipelineCardModel
  estimate: Estimate
  sourceColumnId: string
  initialPointer: { x: number; y: number }
  pointerOffset: { x: number; y: number }
  initialWidth: number
}

function JobsPipelineBoard({ kind }: { kind: "sales" | "jobs" }) {
  const scope = useScope()
  const { language } = useFieldLanguage()
  const progressOnly = kind === "jobs" && scope.session?.role === "project_manager"
  const jobLanguage = language
  const say = (text: string) => officeLabel(text, language)

  const [filters, setFilters] = useState<BoardFilters>(OPEN_FILTERS)
  const [crew, setCrew] = useState(false)
  const [renaming, setRenaming] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState("")
  const [newLabel, setNewLabel] = useState("")
  const [newAfter, setNewAfter] = useState("")
  const [columnError, setColumnError] = useState("")
  const [optimisticOverrides, setOptimisticOverrides] = useState<Record<string, string>>({})
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

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
      kind,
      filters,
      todayIso(),
    )
  }, [scope, kind, filters])

  // Clear obsolete optimistic overrides when store catches up
  useEffect(() => {
    if (Object.keys(optimisticOverrides).length === 0) return
    const nextOverrides = { ...optimisticOverrides }
    let changed = false

    for (const [estimateId, overrideColumnId] of Object.entries(optimisticOverrides)) {
      const estimate = scope.estimates.find((item) => item.id === estimateId)
      if (estimate) {
        const order = scope.workOrders.find((item) => item.estimateId === estimate.id)
        const stage = scope.stageById(estimate.stageId)
        const actualCol = jobStageOf(estimate, order, stage?.slug)
        if (actualCol === overrideColumnId) {
          delete nextOverrides[estimateId]
          changed = true
        }
      }
    }

    if (changed) {
      setOptimisticOverrides(nextOverrides)
    }
  }, [scope.estimates, scope.workOrders, scope.stages, optimisticOverrides])

  // Columns with optimistic overrides applied
  const columns: PipelineColumnModel[] = useMemo(() => {
    if (Object.keys(optimisticOverrides).length === 0) return rawColumns

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

  const visibleColumns = progressOnly
    ? columns.filter(
        (column) =>
          column.id === "project_accepted" ||
          column.id === "project_scheduled" ||
          column.id === "project_in_progress",
      )
    : columns

  const allColumnOptions = useMemo(() => {
    return visibleColumns.map((col) => ({ id: col.id, label: col.label }))
  }, [visibleColumns])

  // Move card handler with instant optimistic update and rollback
  const handleMoveCard = useCallback(
    async (estimateId: string, targetColumnId: string) => {
      const originalEstimate = scope.estimates.find((item) => item.id === estimateId)
      if (!originalEstimate) return

      const order = scope.workOrders.find((item) => item.estimateId === originalEstimate.id)
      const stage = scope.stageById(originalEstimate.stageId)
      const sourceCol = jobStageOf(originalEstimate, order, stage?.slug) || "project_accepted"
      if (sourceCol === targetColumnId) return

      setOptimisticOverrides((prev) => ({
        ...prev,
        [estimateId]: targetColumnId,
      }))
      setErrorMessage(null)

      try {
        scope.placeOnColumn(estimateId, targetColumnId)
        await flushBook()
      } catch {
        setOptimisticOverrides((prev) => {
          const next = { ...prev }
          delete next[estimateId]
          return next
        })
        setErrorMessage("Could not move job to new stage. Reverted changes.")
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

      startEdgeAutoScroll(e.clientX)
    }

    const handlePointerUp = () => {
      stopEdgeAutoScroll()

      const currentDrag = activeDragRef.current
      const currentTarget = hoveredColRef.current
      const didMove = hasMovedRef.current

      if (didMove) {
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

  const title = fieldJobHeading(
    progressOnly ? "Progress jobs" : kind === "sales" ? "Sales Pipeline" : "Jobs Pipeline",
    jobLanguage,
  )
  const footerLabel = kind === "sales" ? "Total Value" : "Total Revenue"

  return (
    <div className="flex min-w-0 flex-col gap-4 overflow-x-hidden" data-testid={kind === "sales" ? "sales-pipeline" : "jobs-pipeline"}>
      {progressOnly ? null : <PipelineTabs kind={kind} crew={crew} onCrew={setCrew} language={jobLanguage} />}
      {crew && kind === "jobs" && !progressOnly ? (
        <DispatchBoard />
      ) : (
        <>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
              <p className="text-sm text-muted-foreground">
                {officeCount(visibleColumns.reduce((sum, column) => sum + column.cards.length, 0), jobLanguage)}
                {kind === "sales" ? officeSalesNote(jobLanguage) : ""}
              </p>
            </div>
            {progressOnly ? null : (
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex items-center gap-1">
                <button
                  type="button"
                  aria-label="Scroll left"
                  onClick={() => scrollHorizontally(-300)}
                  className="flex size-8 items-center justify-center rounded-lg border border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  <ChevronLeft className="size-4" />
                </button>
                <button
                  type="button"
                  aria-label="Scroll right"
                  onClick={() => scrollHorizontally(300)}
                  className="flex size-8 items-center justify-center rounded-lg border border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  <ChevronRight className="size-4" />
                </button>
              </div>
              <Link href="/follow-ups" className="text-sm font-medium text-primary hover:underline">
                {say("Follow-ups")}
              </Link>
            </div>
            )}
          </div>
          {errorMessage && (
            <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-2 text-sm text-destructive">
              {errorMessage}
            </div>
          )}
          {progressOnly ? null : (
          <div className="flex flex-wrap items-center gap-2">
            <NewLeadButton label={say("+ New Lead")} className={newLeadButtonClass()} />
            <Link
              href="/estimates/new"
              data-testid="new-proposal"
              className={cn(buttonVariants({ variant: "outline" }), "h-9")}
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
          </div>
          )}
          <div
            ref={scrollContainerRef}
            className="flex flex-col gap-3 md:flex-row md:items-start md:overflow-x-auto md:pb-2 scroll-smooth"
          >
            {visibleColumns.map((column) => (
              <section
                key={column.id}
                ref={(el) => {
                  columnRefs.current[column.id] = el
                }}
                data-testid={`column-${column.id}`}
                className={cn(
                  "flex w-full flex-col gap-3 self-stretch rounded-2xl bg-muted/40 p-3 md:w-72 md:shrink-0 transition-all duration-150",
                  activeDrag && hoveredColumnId === column.id && "ring-2 ring-primary/40 bg-primary/[0.04] shadow-md",
                )}
              >
                <header className="flex items-baseline justify-between gap-2 px-1">
                  {renaming === column.id ? (
                    <form
                      className="flex min-w-0 flex-1 gap-1"
                      onSubmit={(event) => {
                        event.preventDefault()
                        if (!renameValue.trim()) return
                        scope.renameBoardColumn(column.id, renameValue)
                        setRenaming(null)
                      }}
                    >
                      <Input
                        value={renameValue}
                        aria-label={`Rename ${column.label}`}
                        className="h-8"
                        onValueChange={setRenameValue}
                      />
                      <Button type="submit" className="h-8 px-2">
                        Save
                      </Button>
                    </form>
                  ) : (
                    <h2 className="text-xs font-semibold tracking-[0.14em] text-muted-foreground uppercase" data-testid={`column-label-${column.id}`}>
                      {fieldJobHeading(column.label, jobLanguage)}
                    </h2>
                  )}
                  <span className="text-xs tabular-nums text-muted-foreground">{column.cards.length}</span>
                </header>
                {renaming === column.id || progressOnly ? null : (
                  <div className="flex gap-2 px-1">
                    <button
                      type="button"
                      className="text-xs font-medium text-primary"
                      data-testid={`rename-column-${column.id}`}
                      onClick={() => {
                        setRenaming(column.id)
                        setRenameValue(column.label)
                      }}
                    >
                      {say("Rename")}
                    </button>
                    {column.custom ? (
                      <button
                        type="button"
                        className="text-xs font-medium text-destructive"
                        data-testid={`remove-column-${column.id}`}
                        onClick={() => scope.removeCustomColumn(column.id)}
                      >
                        {say("Remove")}
                      </button>
                    ) : null}
                  </div>
                )}
                <div className="flex flex-1 flex-col gap-3">
                  {column.cards.length === 0 ? (
                    <p className="rounded-xl border border-dashed border-border px-3 py-6 text-center text-sm text-muted-foreground">
                      {fieldJobEmpty(column.label, column.empty, jobLanguage)}
                    </p>
                  ) : (
                    column.cards.map((card) => {
                      const estimate = scope.estimates.find((item) => item.id === card.estimateId)
                      if (!estimate) return null
                      return (
                        <DealCard
                          key={card.estimateId}
                          estimate={estimate}
                          clientName={card.clientName}
                          total={card.total}
                          mode={kind}
                          allColumns={allColumnOptions}
                          isDragging={activeDrag?.card.estimateId === card.estimateId}
                          onDragStart={(e) => handleStartDrag(card, estimate, column.id, e)}
                          onMoveToColumn={(targetCol) => void handleMoveCard(card.estimateId, targetCol)}
                        />
                      )
                    })
                  )}
                </div>
                <footer
                  data-testid={`column-footer-${column.id}`}
                  className="mt-auto rounded-xl bg-card px-3 py-2 border border-slate-200 bg-white shadow-sm"
                >
                  <p className="text-[11px] font-medium tracking-wide text-muted-foreground">
                    {footerLabel}
                  </p>
                  <p className="font-display text-2xl leading-none text-price tabular-nums">
                    {scope.session?.role === "estimator" ? column.cards.length : moneyExact(column.total)}
                  </p>
                </footer>
              </section>
            ))}
            {progressOnly ? null : (
            <form
              className="flex w-full shrink-0 flex-col gap-2 self-start rounded-2xl border border-dashed border-border p-3 md:w-72"
              data-testid="add-column"
              onSubmit={(event) => {
                event.preventDefault()
                const result = scope.addCustomColumn(kind, newLabel, newAfter)
                if (result.ok) {
                  setNewLabel("")
                  setNewAfter("")
                  setColumnError("")
                } else {
                  setColumnError(result.reason)
                }
              }}
            >
              <p className="text-xs font-semibold tracking-[0.14em] text-muted-foreground uppercase">Add a column</p>
              <Input
                value={newLabel}
                aria-label="New column name"
                placeholder="Column name"
                className="h-9"
                data-testid="new-column-name"
                onValueChange={setNewLabel}
              />
              <select
                aria-label="Place the column after"
                value={newAfter}
                data-testid="new-column-after"
                className="h-9 rounded-lg border border-input bg-transparent px-2 text-sm"
                onChange={(event) => setNewAfter(event.target.value)}
              >
                <option value="">At the end</option>
                {boardColumns(scope, kind)
                  .filter((column) => !column.custom)
                  .map((column) => (
                    <option key={column.id} value={column.id}>
                      After {column.label}
                    </option>
                  ))}
              </select>
              <Button type="submit" className="h-9" data-testid="add-column-submit">
                Add column
              </Button>
              {columnError ? (
                <p className="text-xs text-destructive" data-testid="add-column-error">
                  {columnError}
                </p>
              ) : null}
            </form>
            )}
          </div>
        </>
      )}

      {/* Floating Drag Overlay */}
      {activeDrag && pointerPos && hasMoved && (
        <div
          style={{
            position: "fixed",
            left: pointerPos.x - activeDrag.pointerOffset.x,
            top: pointerPos.y - activeDrag.pointerOffset.y,
            width: activeDrag.initialWidth,
            pointerEvents: "none",
            zIndex: 9999,
          }}
        >
          <DealCard
            estimate={activeDrag.estimate}
            clientName={activeDrag.card.clientName}
            total={activeDrag.card.total}
            mode="jobs"
            isOverlay
          />
        </div>
      )}
    </div>
  )
}

function PipelineTabs({
  kind,
  crew,
  onCrew,
  language,
}: {
  kind: "sales" | "jobs"
  crew: boolean
  onCrew: (crew: boolean) => void
  language: "en" | "es"
}) {
  const salesActive = kind === "sales"
  const jobsActive = kind === "jobs" && !crew
  return (
    <div className="flex flex-wrap gap-2" role="tablist" aria-label="Pipeline">
      <Link
        href="/sales-pipeline"
        role="tab"
        aria-selected={salesActive}
        data-testid="tab-sales"
        className={tabClass(salesActive)}
      >
        {fieldJobHeading("Sales Pipeline", language)}
      </Link>
      {kind === "jobs" ? (
        <button type="button" role="tab" aria-selected={jobsActive} data-testid="tab-jobs" className={tabClass(jobsActive)} onClick={() => onCrew(false)}>
          {fieldJobHeading("Jobs Pipeline", language)}
        </button>
      ) : (
        <Link href="/dispatch" role="tab" aria-selected={false} data-testid="tab-jobs" className={tabClass(false)}>
          {fieldJobHeading("Jobs Pipeline", language)}
        </Link>
      )}
      {kind === "jobs" ? (
        <button type="button" role="tab" aria-selected={crew} data-testid="tab-crew" className={tabClass(crew)} onClick={() => onCrew(true)}>
          {fieldJobHeading("Crew board", language)}
        </button>
      ) : null}
    </div>
  )
}

function tabClass(active: boolean): string {
  return cn(
    "rounded-full px-3 py-2 text-sm font-medium",
    active ? "bg-primary text-primary-foreground" : "bg-muted text-foreground",
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
    <label className="flex min-w-0 basis-full items-center gap-2 text-sm sm:basis-auto">
      <span className="shrink-0 text-muted-foreground">{label}</span>
      <select
        aria-label={label}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 min-w-0 flex-1 rounded-lg border border-input bg-background px-2 text-sm sm:h-9"
      >
        {children}
      </select>
    </label>
  )
}
