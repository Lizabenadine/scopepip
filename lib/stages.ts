import type { PipelineStage, StageSlug } from "./types.ts"

export function sameRates<T extends object>(left: T, right: T): boolean {
  const keys = Object.keys(left) as (keyof T)[]
  return (
    keys.length === Object.keys(right).length &&
    keys.every((key) => left[key] === right[key])
  )
}


export const NEXT_ACTION: Record<StageSlug, string | null> = {
  lead: "Mark sent",
  estimate_sent: "Schedule",
  scheduled: "Complete",
  completed: null,
}

export const EMPTY_STAGE: Record<StageSlug, string> = {
  lead: "A call or a text starts here.",
  estimate_sent: "Nothing out for approval.",
  scheduled: "No days on the calendar.",
  completed: "Finished jobs land here.",
}

export function stageTone(slug: StageSlug): string {
  switch (slug) {
    case "lead":
      return "bg-[oklch(0.93_0.012_80)] text-[oklch(0.32_0.02_55)]"
    case "estimate_sent":
      return "bg-[oklch(0.92_0.045_250)] text-[oklch(0.32_0.08_250)]"
    case "scheduled":
      return "bg-[oklch(0.94_0.06_85)] text-[oklch(0.38_0.08_65)]"
    case "completed":
      return "bg-[oklch(0.93_0.05_155)] text-[oklch(0.32_0.07_155)]"
  }
}

export function orderedStages(stages: PipelineStage[]): PipelineStage[] {
  return [...stages].sort((a, b) => a.sortOrder - b.sortOrder)
}

export function adjacentStage(
  stages: PipelineStage[],
  stageId: string,
  direction: 1 | -1,
): PipelineStage | null {
  const ordered = orderedStages(stages)
  const index = ordered.findIndex((stage) => stage.id === stageId)
  if (index < 0) return null
  return ordered[index + direction] ?? null
}
