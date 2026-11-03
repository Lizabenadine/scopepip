import type { ScopeState } from "../data/seed.ts"
import { collectDueFollowUps } from "../follow-ups/schedule.ts"
import { listPaymentRows } from "../payments/ledger.ts"
import { jobStageOf } from "../pipeline/board.ts"
import type { Estimate } from "../types.ts"

export interface OverviewItem {
  id: string
  label: string
  count: number
  href: string
  detail: string
  amount?: number
}

export function officeOverview(
  state: ScopeState,
  now: Date,
  totalFor: (estimate: Estimate) => number,
): OverviewItem[] {
  const today = localDay(now)
  const appointments = state.estimates.filter((estimate) => !estimate.archived && visitDay(estimate) === today)
  const awaiting = state.estimates.filter(
    (estimate) => estimate.clientStatus === "sent" && !estimate.archived && !estimate.declinedAt,
  )
  const due = collectDueFollowUps(state, now.getTime())
  const inProgress = state.estimates.filter((estimate) => jobColumn(state, estimate) === "project_in_progress")
  const scheduled = state.estimates.filter((estimate) => {
    if (estimate.archived) return false
    const order = state.workOrders.find((item) => item.estimateId === estimate.id)
    const upcoming = order?.scheduledStartDate ? order.scheduledStartDate >= today : false
    return jobColumn(state, estimate) === "project_scheduled" || upcoming
  })
  const outstanding = listPaymentRows(state.estimates, state.clients, totalFor).filter((row) => row.balance > 0)
  const outstandingAmount = outstanding.reduce((sum, row) => sum + row.balance, 0)
  return [
    item("appointments", "Today's appointments", appointments.length, "/appointments", countDetail(appointments.length, "appointment")),
    item("awaiting", "Estimates awaiting approval", awaiting.length, "/sales-pipeline", countDetail(awaiting.length, "proposal")),
    item("follow-ups", "Follow-ups due today", due.length, "/follow-ups", countDetail(due.length, "message")),
    item("in-progress", "Jobs in progress", inProgress.length, "/dispatch", countDetail(inProgress.length, "job")),
    item("scheduled", "Upcoming scheduled jobs", scheduled.length, "/calendar", countDetail(scheduled.length, "job")),
    {
      ...item("payments", "Outstanding payments", outstanding.length, "/payments", countDetail(outstanding.length, "invoice")),
      amount: roundCents(outstandingAmount),
    },
  ]
}

function item(id: string, label: string, count: number, href: string, detail: string): OverviewItem {
  return { id, label, count, href, detail }
}

function jobColumn(state: ScopeState, estimate: Estimate): string | null {
  const stage = state.stages.find((item) => item.id === estimate.stageId)
  const order = state.workOrders.find((item) => item.estimateId === estimate.id)
  return jobStageOf(estimate, order, stage?.slug)
}

function visitDay(estimate: Estimate): string | null {
  if (estimate.estimateVisitOn && /^\d{4}-\d{2}-\d{2}$/.test(estimate.estimateVisitOn)) return estimate.estimateVisitOn
  if (!estimate.estimateVisitAt) return null
  const parsed = new Date(estimate.estimateVisitAt)
  if (Number.isNaN(parsed.getTime())) return null
  return localDay(parsed)
}

function localDay(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${date.getFullYear()}-${month}-${day}`
}

function countDetail(count: number, noun: string): string {
  if (count === 0) return `No ${noun}s right now.`
  return count === 1 ? `1 ${noun}` : `${count} ${noun}s`
}

function roundCents(value: number): number {
  return Math.round(value * 100) / 100
}
