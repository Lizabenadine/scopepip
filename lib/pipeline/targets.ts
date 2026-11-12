import type { JobPipelineStage, SalesStage } from "../types.ts"

export type DashboardMetricKey =
  | "new_leads"
  | "estimates_sent"
  | "accepted"
  | "scheduled"
  | "completed"
  | "revenue"

export interface PipelineStageTarget {
  board: "sales" | "jobs"
  route: "/sales-pipeline" | "/dispatch"
  stageId: SalesStage | JobPipelineStage
}

/** Maps each dashboard summary KPI card to its authoritative pipeline route and stage ID. */
export const DASHBOARD_METRIC_TARGETS: Record<DashboardMetricKey, PipelineStageTarget> = {
  new_leads: { board: "sales", route: "/sales-pipeline", stageId: "cold" },
  estimates_sent: { board: "sales", route: "/sales-pipeline", stageId: "proposal_sent" },
  accepted: { board: "jobs", route: "/dispatch", stageId: "project_accepted" },
  scheduled: { board: "jobs", route: "/dispatch", stageId: "project_scheduled" },
  completed: { board: "jobs", route: "/dispatch", stageId: "project_completed" },
  revenue: { board: "jobs", route: "/dispatch", stageId: "project_accepted" },
}

/** Builds a pipeline URL optionally focused on a specific stage column ID. */
export function pipelineStageHref(route: "/sales-pipeline" | "/dispatch", stageId?: string): string {
  if (!stageId) return route
  return `${route}?stage=${encodeURIComponent(stageId)}`
}

/** Returns the target pipeline href for a given dashboard metric card. */
export function dashboardMetricHref(key: DashboardMetricKey): string {
  const target = DASHBOARD_METRIC_TARGETS[key]
  return pipelineStageHref(target.route, target.stageId)
}

/** Resolves a requested stage ID against the visible pipeline columns, falling back cleanly. */
export function resolveTargetStageId(
  columns: readonly { id: string }[],
  requestedStageId: string | null | undefined,
): string {
  if (requestedStageId && columns.some((column) => column.id === requestedStageId)) {
    return requestedStageId
  }
  return columns[0]?.id ?? ""
}
