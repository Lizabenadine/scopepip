import type { ScopeState } from "../data/seed.ts"
import { collectDueFollowUps } from "../follow-ups/schedule.ts"
import { listPaymentRows } from "../payments/ledger.ts"
import { jobStageOf, salesStageOf } from "../pipeline/board.ts"
import type { Estimate, WorkOrder } from "../types.ts"

export const JOB_FLOW = [
  { id: "lead", label: "Lead" },
  { id: "estimate", label: "Estimate" },
  { id: "approval", label: "Approval" },
  { id: "scheduling", label: "Scheduling" },
  { id: "work_order", label: "Work order" },
  { id: "completion", label: "Completion" },
  { id: "payment", label: "Payment" },
] as const

export type JobFlowId = (typeof JOB_FLOW)[number]["id"]

export interface OfficeTask {
  id: string
  title: string
  detail: string
  href: string
  amount?: number
}

export interface OfficeQueues {
  upcoming: OfficeTask[]
  followUps: OfficeTask[]
  estimates: OfficeTask[]
  invoices: OfficeTask[]
}

export function jobFlowStep(
  estimate: Estimate,
  order: WorkOrder | undefined,
  stageSlug: string | undefined,
): JobFlowId {
  if (estimate.paymentStatus === "paid") return "payment"
  const job = jobStageOf(estimate, order, stageSlug)
  if (job === "project_completed") return "payment"
  if (job === "project_in_progress" || job === "project_scheduled") return "work_order"
  if (job === "project_accepted") return "scheduling"
  const sales = salesStageOf(estimate)
  if (sales === "proposal_sent") return "approval"
  if (sales === "estimate_requested" || sales === "estimate_scheduled") return "estimate"
  return "lead"
}

export function jobFlowIndex(step: JobFlowId): number {
  return JOB_FLOW.findIndex((item) => item.id === step)
}

export function officeWorklist(
  state: ScopeState,
  now: Date,
  totalFor: (estimate: Estimate) => number,
): OfficeQueues {
  const upcoming = state.estimates
    .filter((estimate) => {
      if (estimate.archived) return false
      const column = columnFor(state, estimate)
      return column === "project_scheduled" || column === "project_in_progress"
    })
    .sort((left, right) => jobDate(state, left).localeCompare(jobDate(state, right)))
    .slice(0, 6)
    .map((estimate) => task(estimate, state, jobDate(state, estimate), `/work-orders/${estimate.id}`))

  const followUps = collectDueFollowUps(state, now.getTime())
    .slice(0, 6)
    .map((item) => {
      const estimate = state.estimates.find((row) => row.id === item.estimateId)
      const client = state.clients.find((row) => row.id === estimate?.clientId)
      return {
        id: `${item.estimateId}-${item.stepId}`,
        title: client?.name || estimate?.title || "Follow-up",
        detail: item.channel === "email" ? "Email" : "Text",
        href: `/estimates/${item.estimateId}`,
      }
    })

  const estimates = state.estimates
    .filter((estimate) => estimate.clientStatus === "sent" && !estimate.archived && !estimate.declinedAt)
    .slice(0, 6)
    .map((estimate) => task(estimate, state, estimate.title, `/estimates/${estimate.id}`, totalFor(estimate)))

  const invoices = listPaymentRows(state.estimates, state.clients, totalFor)
    .filter((row) => row.balance > 0)
    .slice(0, 6)
    .map((row) => ({
      id: row.id,
      title: row.clientName,
      detail: row.title,
      href: "/payments",
      amount: row.balance,
    }))

  return { upcoming, followUps, estimates, invoices }
}

function columnFor(state: ScopeState, estimate: Estimate): string | null {
  const stage = state.stages.find((item) => item.id === estimate.stageId)
  const order = state.workOrders.find((item) => item.estimateId === estimate.id)
  return jobStageOf(estimate, order, stage?.slug)
}

function jobDate(state: ScopeState, estimate: Estimate): string {
  const order = state.workOrders.find((item) => item.estimateId === estimate.id)
  return order?.scheduledStartDate || estimate.scheduledOn || "9999-12-31"
}

function task(estimate: Estimate, state: ScopeState, detail: string, href: string, amount?: number): OfficeTask {
  const client = state.clients.find((item) => item.id === estimate.clientId)
  return {
    id: estimate.id,
    title: client?.name || estimate.title,
    detail,
    href,
    ...(amount && amount > 0 ? { amount: Math.round(amount * 100) / 100 } : {}),
  }
}

