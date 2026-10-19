import { calculateEstimate } from "../estimate/calculate.ts"
import type { ScopeState } from "../data/seed.ts"
import { moneyExact } from "../format.ts"
import {
  SALES_STAGES,
  type Estimate,
  type JobPipelineStage,
  type LeadSource,
  type SalesStage,
  type WorkOrder,
} from "../types.ts"

export const DEAL_LABELS = ["On Hold", "Needs HOA", "No Answer", "Bad Info", "NEW"] as const

export function nextSalesStage(stage: SalesStage): SalesStage | null {
  const index = SALES_STAGES.indexOf(stage)
  if (index < 0 || index >= SALES_STAGES.length - 1) return null
  return SALES_STAGES[index + 1] ?? null
}

export const SALES_COLUMNS: { id: SalesStage; label: string; empty: string }[] = [
  { id: "cold", label: "Cold Leads", empty: "No cold leads in this view." },
  { id: "warm", label: "Warm Leads", empty: "No warm leads in this view." },
  { id: "estimate_requested", label: "Estimate Requested", empty: "No estimate requests in this view." },
  { id: "estimate_scheduled", label: "Estimate Scheduled", empty: "No site visits booked." },
  { id: "proposal_sent", label: "Proposal Sent", empty: "No proposals out." },
]

export const JOB_COLUMNS: { id: JobPipelineStage; label: string; empty: string }[] = [
  { id: "project_accepted", label: "Project Accepted", empty: "Accepted projects land here." },
  { id: "project_scheduled", label: "Project Scheduled", empty: "Nothing is on the calendar." },
  { id: "project_in_progress", label: "Project In Progress", empty: "No crew is on site." },
  { id: "project_completed", label: "Project Completed", empty: "Finished projects land here." },
]

export const LEAD_SOURCE_LABELS: Record<LeadSource, string> = {
  website: "Website",
  thumbtack: "Thumbtack",
  angi: "Angi",
  google_lsa: "Google Local Services",
  facebook: "Facebook",
  yelp: "Yelp",
  google: "Google",
  referral: "Referral",
}

export const DATE_RANGES = [
  { id: "all", label: "Any date" },
  { id: "30", label: "Last 30 days" },
  { id: "90", label: "Last 90 days" },
  { id: "year", label: "This year" },
] as const

export type DateRange = (typeof DATE_RANGES)[number]["id"]

export interface BoardFilters {
  leadSource: LeadSource | "all"
  dateRange: DateRange
  salesperson: string
}

export const OPEN_FILTERS: BoardFilters = {
  leadSource: "all",
  dateRange: "all",
  salesperson: "all",
}

export interface PipelineCardModel {
  estimateId: string
  clientName: string
  total: number
  column: string
}

export interface PipelineColumnModel {
  id: string
  label: string
  empty: string
  custom: boolean
  cards: PipelineCardModel[]
  total: number
}

export function boardColumns(
  state: Pick<ScopeState, "customColumns" | "columnLabels">,
  kind: "sales" | "jobs",
): { id: string; label: string; empty: string; custom: boolean }[] {
  const builtIn = kind === "sales" ? SALES_COLUMNS : JOB_COLUMNS
  const labels = state.columnLabels ?? {}
  const columns: { id: string; label: string; empty: string; custom: boolean }[] = builtIn.map((column) => ({
    id: column.id,
    label: labels[column.id]?.trim() || column.label,
    empty: column.empty,
    custom: false,
  }))
  const custom = (state.customColumns ?? []).filter((column) => column.kind === kind)
  custom.forEach((column, index) => {
    const entry = { id: column.id, label: column.label, empty: "Nothing in this column.", custom: true }
    const anchor = columns.findIndex((item) => item.id === column.after)
    if (anchor < 0) {
      columns.push(entry)
      return
    }
    const earlier = new Set(custom.slice(0, index).filter((item) => item.after === column.after).map((item) => item.id))
    let cursor = anchor + 1
    while (cursor < columns.length && earlier.has(columns[cursor]?.id ?? "")) cursor += 1
    columns.splice(cursor, 0, entry)
  })
  return columns
}

export function salesStageOf(estimate: Estimate): SalesStage | null {
  if (estimate.archived) return null
  if (estimate.clientStatus === "accepted" || estimate.paymentStatus === "deposit_paid") return null
  if (estimate.salesStage) return estimate.salesStage
  if (estimate.clientStatus === "sent") return "proposal_sent"
  return "cold"
}

export function jobStageOf(
  estimate: Estimate,
  order: WorkOrder | undefined,
  stageSlug: string | undefined,
): JobPipelineStage | null {
  if (estimate.archived) return null
  const onJobs =
    estimate.clientStatus === "accepted" ||
    estimate.paymentStatus === "deposit_paid" ||
    stageSlug === "scheduled" ||
    stageSlug === "completed"
  if (!onJobs) return null
  if (order?.status === "complete" || stageSlug === "completed") return "project_completed"
  if (order?.status === "in_progress") return "project_in_progress"
  if (order?.status === "scheduled" || stageSlug === "scheduled") return "project_scheduled"
  return "project_accepted"
}

export function invoiceStatus(estimate: Estimate, total: number): string {
  const invoiced = estimate.clientStatus === "accepted" || estimate.paymentStatus === "deposit_paid"
  if (!invoiced) return "Not invoiced"
  const paid = estimate.depositReceipt?.amount ?? 0
  const balance = Math.max(0, roundCents(total - paid))
  if (balance <= 0) return "Invoice paid"
  if (paid > 0) return `Invoice balance ${moneyExact(balance)}`
  return `Balance due ${moneyExact(balance)}`
}

export function shiftIsoDay(isoDay: string, days: number): string {
  const [year, month, day] = isoDay.split("-").map(Number)
  const date = new Date(Date.UTC(year, (month ?? 1) - 1, day ?? 1))
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

export function inDateRange(createdAt: string, range: DateRange, today: string): boolean {
  if (range === "all") return true
  const day = createdAt.slice(0, 10)
  if (range === "year") return day.slice(0, 4) === today.slice(0, 4)
  const start = shiftIsoDay(today, range === "30" ? -30 : -90)
  return day >= start && day <= today
}

export function matchesBoardFilters(estimate: Estimate, filters: BoardFilters, today: string): boolean {
  if (filters.leadSource !== "all" && estimate.leadSource !== filters.leadSource) return false
  if (filters.salesperson !== "all" && (estimate.salesperson || "") !== filters.salesperson) return false
  return inDateRange(estimate.createdAt, filters.dateRange, today)
}

export function salespersonOptions(estimates: Estimate[]): string[] {
  return [...new Set(estimates.map((estimate) => estimate.salesperson?.trim() || "").filter(Boolean))].sort(
    (a, b) => a.localeCompare(b),
  )
}

function quoteTotal(state: ScopeState, estimate: Estimate): number {
  if (estimate.areas.length === 0 && estimate.lineItems.length === 0) return 0
  return calculateEstimate({
    areas: estimate.areas,
    lineItems: estimate.lineItems,
    rates: estimate.rates,
    settings: estimate.settings,
    paymentMethods: state.paymentMethods,
  }).total
}

export function buildPipeline(
  state: ScopeState,
  kind: "sales" | "jobs",
  filters: BoardFilters,
  today: string,
): PipelineColumnModel[] {
  const cards: PipelineCardModel[] = []
  for (const estimate of state.estimates) {
    if (!matchesBoardFilters(estimate, filters, today)) continue
    const stage = state.stages.find((item) => item.id === estimate.stageId)
    const order = state.workOrders.find((item) => item.estimateId === estimate.id)
    const computed = kind === "sales" ? salesStageOf(estimate) : jobStageOf(estimate, order, stage?.slug)
    if (!computed) continue
    const client = state.clients.find((item) => item.id === estimate.clientId)
    cards.push({
      estimateId: estimate.id,
      clientName: client?.name ?? "Missing client",
      total: quoteTotal(state, estimate),
      column: computed,
    })
  }

  const definitions = boardColumns(state, kind)
  const customIds = new Set(definitions.filter((column) => column.custom).map((column) => column.id))
  for (const card of cards) {
    const estimate = state.estimates.find((item) => item.id === card.estimateId)
    const parked = estimate?.boardColumnId
    if (parked && customIds.has(parked)) card.column = parked
  }
  return definitions.map((column) => {
    const columnCards = cards
      .filter((card) => card.column === column.id)
      .sort((a, b) => a.clientName.localeCompare(b.clientName))
    return {
      ...column,
      cards: columnCards,
      total: roundCents(columnCards.reduce((sum, card) => sum + card.total, 0)),
    }
  })
}

function roundCents(value: number): number {
  return Math.round(value * 100) / 100
}
