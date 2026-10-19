import type { ScopeState } from "../data/seed.ts"
import type { DispatchStatus, Estimate, WorkOrder } from "../types.ts"
import { createWorkOrder } from "../work-orders/defaults.ts"
import { jobDate } from "../format.ts"

export const DISPATCH_STATUSES: DispatchStatus[] = [
  "unscheduled",
  "scheduled",
  "in_progress",
  "complete",
]

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

export interface AssignmentInput {
  estimateId: string
  status: DispatchStatus
  assignedCrewId: string | null
  scheduledStartDate: string | null
  notifiedAt: string
}

export interface AssignmentOptions {
  allowUnknownCrew?: boolean
}

export type AssignmentResult =
  | { ok: true; state: ScopeState; notice: string; changed: boolean }
  | { ok: false; reason: string }

export function isOnDispatchBoard(estimate: Estimate, stageSlug: string | undefined): boolean {
  return (
    estimate.clientStatus === "accepted" ||
    estimate.paymentStatus === "deposit_paid" ||
    stageSlug === "scheduled" ||
    stageSlug === "completed"
  )
}

export function fieldsForStatus(
  current: Pick<WorkOrder, "status" | "assignedCrewId" | "scheduledStartDate">,
  estimateScheduledOn: string | null,
  status: DispatchStatus,
  today: string,
): Pick<AssignmentInput, "status" | "assignedCrewId" | "scheduledStartDate"> {
  if (status === "unscheduled") {
    return { status, assignedCrewId: null, scheduledStartDate: null }
  }
  return {
    status,
    assignedCrewId: current.assignedCrewId,
    scheduledStartDate: current.scheduledStartDate ?? estimateScheduledOn ?? today,
  }
}

export function fieldsForCrew(
  current: Pick<WorkOrder, "status" | "assignedCrewId" | "scheduledStartDate">,
  estimateScheduledOn: string | null,
  crewId: string,
  today: string,
): Pick<AssignmentInput, "status" | "assignedCrewId" | "scheduledStartDate"> {
  const status = current.status === "unscheduled" ? "scheduled" : current.status
  return {
    status,
    assignedCrewId: crewId,
    scheduledStartDate: current.scheduledStartDate ?? estimateScheduledOn ?? today,
  }
}

export function fieldsForDate(
  current: Pick<WorkOrder, "status" | "assignedCrewId" | "scheduledStartDate">,
  date: string | null,
): Pick<AssignmentInput, "status" | "assignedCrewId" | "scheduledStartDate"> {
  if (!date) return { status: "unscheduled", assignedCrewId: null, scheduledStartDate: null }
  const status = current.status === "unscheduled" ? "scheduled" : current.status
  return { status, assignedCrewId: current.assignedCrewId, scheduledStartDate: date }
}

export function workOrderForStage(
  order: WorkOrder,
  stageSlug: string | undefined,
  scheduledOn: string | null,
): WorkOrder {
  if (stageSlug === "completed") {
    return {
      ...order,
      status: "complete",
      scheduledStartDate: order.scheduledStartDate ?? scheduledOn,
    }
  }
  if (stageSlug === "scheduled") {
    return {
      ...order,
      status: order.status === "in_progress" ? "in_progress" : "scheduled",
      scheduledStartDate: scheduledOn ?? order.scheduledStartDate,
    }
  }
  if (stageSlug === "lead" || stageSlug === "estimate_sent") {
    return {
      ...order,
      status: "unscheduled",
      assignedCrewId: null,
      scheduledStartDate: null,
      notifiedAt: null,
    }
  }
  return order
}

export function applyAssignment(
  state: ScopeState,
  input: AssignmentInput,
  options: AssignmentOptions = {},
): AssignmentResult {
  const estimate = state.estimates.find((item) => item.id === input.estimateId)
  if (!estimate) return { ok: false, reason: "This job is not on file." }
  if (!DISPATCH_STATUSES.includes(input.status)) {
    return { ok: false, reason: "That dispatch column is not on the board." }
  }
  const stage = state.stages.find((item) => item.id === estimate.stageId)
  if (!isOnDispatchBoard(estimate, stage?.slug)) {
    return { ok: false, reason: "Accept the proposal before dispatching the crew." }
  }

  const crewId = input.assignedCrewId || null
  const startDate = input.scheduledStartDate || null
  if (crewId && !state.crews.some((crew) => crew.id === crewId) && !options.allowUnknownCrew) {
    return { ok: false, reason: "That crew lead is not on the board." }
  }
  if (input.status !== "unscheduled") {
    if (!startDate || !DATE_PATTERN.test(startDate)) {
      return { ok: false, reason: "Pick a start date." }
    }
  }

  const status = input.status
  const assignedCrewId = status === "unscheduled" ? null : crewId
  const scheduledStartDate = status === "unscheduled" ? null : startDate
  const previous = state.workOrders.find((order) => order.estimateId === estimate.id)
  const base = previous ?? createWorkOrder(estimate)
  const crewChanged = Boolean(assignedCrewId) && base.assignedCrewId !== assignedCrewId
  const notifiedAt =
    status === "unscheduled" ? null : crewChanged ? input.notifiedAt : base.notifiedAt

  const unchanged =
    base.status === status &&
    base.assignedCrewId === assignedCrewId &&
    base.scheduledStartDate === scheduledStartDate &&
    base.notifiedAt === notifiedAt
  if (unchanged && previous) {
    return { ok: true, state, notice: "", changed: false }
  }

  const nextOrder: WorkOrder = {
    ...base,
    status,
    assignedCrewId,
    scheduledStartDate,
    notifiedAt,
  }
  const workOrders = previous
    ? state.workOrders.map((order) => (order.estimateId === estimate.id ? nextOrder : order))
    : [nextOrder, ...state.workOrders]

  const scheduledStage = state.stages.find((item) => item.slug === "scheduled")
  const completedStage = state.stages.find((item) => item.slug === "completed")
  const sentStage = state.stages.find((item) => item.slug === "estimate_sent")
  let stageId = estimate.stageId
  let scheduledOn = estimate.scheduledOn
  if (status === "complete" && completedStage) {
    stageId = completedStage.id
    scheduledOn = scheduledStartDate
  } else if ((status === "scheduled" || status === "in_progress") && scheduledStage) {
    stageId = scheduledStage.id
    scheduledOn = scheduledStartDate
  } else if (status === "unscheduled" && sentStage) {
    stageId = sentStage.id
    scheduledOn = null
  }

  const estimates = state.estimates.map((item) =>
    item.id === estimate.id
      ? { ...item, stageId, scheduledOn, updatedAt: input.notifiedAt }
      : item,
  )
  const client = state.clients.find((item) => item.id === estimate.clientId)
  const crew = assignedCrewId ? state.crews.find((item) => item.id === assignedCrewId) : undefined
  const notice = assignmentNotice({
    title: estimate.title,
    clientName: client?.name ?? "This job",
    status,
    crewName: crew?.name ?? null,
    crewPhone: crew?.phone ?? null,
    scheduledStartDate,
    crewChanged,
  })

  return {
    ok: true,
    state: { ...state, estimates, workOrders },
    notice,
    changed: true,
  }
}

export function assignmentNotice(input: {
  title: string
  clientName: string
  status: DispatchStatus
  crewName: string | null
  crewPhone: string | null
  scheduledStartDate: string | null
  crewChanged: boolean
}): string {
  const who = input.clientName
  if (input.status === "unscheduled") return `${who} is back in Unscheduled.`
  const when = input.scheduledStartDate ? jobDate(input.scheduledStartDate) : "the start date"
  if (input.crewChanged && input.crewName) {
    const phone = input.crewPhone ? ` at ${input.crewPhone}` : ""
    return `${input.crewName} notified${phone} for ${input.title} on ${when}.`
  }
  if (input.status === "in_progress") {
    return input.crewName
      ? `${who} is in progress. ${input.crewName} is on site ${when}.`
      : `${who} is in progress for ${when}.`
  }
  if (input.status === "complete") return `${who} is marked complete.`
  if (input.crewName) return `${who} is scheduled for ${when} with ${input.crewName}.`
  return `${who} is scheduled for ${when}. Assign a crew lead.`
}
