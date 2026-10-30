"use client"

import Link from "next/link"
import { useMemo, useState, type ReactNode } from "react"
import { DispatchBoard } from "@/components/dispatch/dispatch-board"
import { useFieldLanguage } from "@/hooks/use-field-language"
import { fieldJobEmpty, fieldJobHeading } from "@/lib/field/copy"
import { officeCount, officeLabel, officeSalesNote } from "@/lib/office/dashboard-copy"
import { DealCard } from "@/components/pipeline/deal-card"
import { NewLeadButton, newLeadButtonClass } from "@/components/pipeline/new-lead-dialog"
import { Button, buttonVariants } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { SCOPE_VERSION } from "@/lib/data/seed"
import { useScope } from "@/lib/data/store"
import { moneyExact } from "@/lib/format"
import {
  boardColumns,
  buildPipeline,
  DATE_RANGES,
  LEAD_SOURCE_LABELS,
  OPEN_FILTERS,
  salespersonOptions,
  type BoardFilters,
} from "@/lib/pipeline/board"
import { LEAD_SOURCES } from "@/lib/types"
import { cn } from "@/lib/utils"

function todayIso(): string {
  const now = new Date()
  const month = `${now.getMonth() + 1}`.padStart(2, "0")
  const day = `${now.getDate()}`.padStart(2, "0")
  return `${now.getFullYear()}-${month}-${day}`
}

export function PipelineBoard({ kind }: { kind: "sales" | "jobs" }) {
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
  const salespeople = useMemo(
    () => salespersonOptions(scope.estimates),
    [scope.estimates],
  )
  const columns = useMemo(() => {
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
  const visibleColumns = progressOnly
    ? columns.filter((column) => column.id === "project_in_progress")
    : columns

  return (
    <div className="flex flex-col gap-4" data-testid={kind === "sales" ? "sales-pipeline" : "jobs-pipeline"}>
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
            <div className="flex gap-4">
              <Link href="/follow-ups" className="text-sm font-medium text-primary hover:underline">
                {say("Follow-ups")}
              </Link>
            </div>
            )}
          </div>
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
          <div className="flex items-start gap-3 overflow-x-auto pb-2">
            {visibleColumns.map((column) => (
              <section
                key={column.id}
                data-testid={`column-${column.id}`}
                className="flex w-72 shrink-0 flex-col gap-3 self-stretch rounded-2xl bg-muted/40 p-3"
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
              className="flex w-72 shrink-0 flex-col gap-2 self-start rounded-2xl border border-dashed border-border p-3"
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
    <label className="flex items-center gap-2 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <select
        aria-label={label}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-9 rounded-lg border border-input bg-background px-2 text-sm"
      >
        {children}
      </select>
    </label>
  )
}
