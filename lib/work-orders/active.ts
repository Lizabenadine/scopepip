import { jobStageOf } from "../pipeline/board.ts"
import type { Client, Estimate, PipelineStage, WorkOrder } from "../types.ts"

export interface ActiveJob {
  id: string
  clientName: string
  title: string
  jobAddress: string
  status: WorkOrder["status"]
  updatedAt: string
}

export function listActiveJobs(
  estimates: Estimate[],
  workOrders: WorkOrder[],
  stages: PipelineStage[],
  clients: Client[],
): ActiveJob[] {
  const jobs: ActiveJob[] = []
  for (const estimate of estimates) {
    const order = workOrders.find((item) => item.estimateId === estimate.id)
    const stage = stages.find((item) => item.id === estimate.stageId)
    if (!jobStageOf(estimate, order, stage?.slug)) continue
    const client = clients.find((item) => item.id === estimate.clientId)
    jobs.push({
      id: estimate.id,
      clientName: client?.name ?? "Client",
      title: estimate.title,
      jobAddress: estimate.jobAddress,
      status: order?.status ?? "unscheduled",
      updatedAt: estimate.updatedAt,
    })
  }
  return jobs.sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
}
