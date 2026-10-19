import { calculateEstimate } from "../estimate/calculate.ts"
import type { ScopeState } from "../data/seed.ts"
import type { DispatchStatus } from "../types.ts"
import { isOnDispatchBoard } from "./assign.ts"

export interface DispatchJob {
  estimateId: string
  clientName: string
  title: string
  address: string
  hours: number
  status: DispatchStatus
  crewId: string | null
  crewName: string | null
  crewPhone: string | null
  crewColor: string | null
  scheduledStartDate: string | null
  notifiedAt: string | null
  estimateScheduledOn: string | null
}

export function dispatchJobs(state: ScopeState): DispatchJob[] {
  return state.estimates.flatMap((estimate) => {
    const stage = state.stages.find((item) => item.id === estimate.stageId)
    if (!isOnDispatchBoard(estimate, stage?.slug)) return []
    const order = state.workOrders.find((item) => item.estimateId === estimate.id)
    const crew = order?.assignedCrewId
      ? state.crews.find((item) => item.id === order.assignedCrewId)
      : undefined
    const client = state.clients.find((item) => item.id === estimate.clientId)
    const quote = calculateEstimate({
      areas: estimate.areas,
      lineItems: estimate.lineItems,
      rates: estimate.rates,
      settings: estimate.settings,
      paymentMethods: state.paymentMethods,
    })
    const status = order?.status ?? (stage?.slug === "completed" ? "complete" : "unscheduled")
    return [
      {
        estimateId: estimate.id,
        clientName: client?.name ?? "Client",
        title: estimate.title,
        address: estimate.jobAddress || client?.address || "Address not set",
        hours: quote.allocatedHours,
        status,
        crewId: order?.assignedCrewId ?? null,
        crewName: crew?.name ?? null,
        crewPhone: crew?.phone ?? null,
        crewColor: crew?.color ?? null,
        scheduledStartDate: order?.scheduledStartDate ?? null,
        notifiedAt: order?.notifiedAt ?? null,
        estimateScheduledOn: estimate.scheduledOn,
      },
    ]
  })
}

export function jobsOnDate(jobs: DispatchJob[], iso: string): DispatchJob[] {
  return jobs
    .filter((job) => job.status !== "unscheduled" && job.scheduledStartDate === iso)
    .sort((a, b) => a.clientName.localeCompare(b.clientName))
}
