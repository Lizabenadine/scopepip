import type { ScopeState } from "../data/seed.ts"
import { jobStageOf, salesStageOf, JOB_COLUMNS, SALES_COLUMNS } from "../pipeline/board.ts"
import type { Estimate, NoteEntry, StageChange } from "../types.ts"

const CAP = 40

export function appendStageChange(estimate: Estimate, label: string, at: string): Estimate {
  const stageChanges = estimate.stageChanges ?? []
  const last = stageChanges[stageChanges.length - 1]
  if (last?.label === label) return estimate
  const next: StageChange = { id: crypto.randomUUID(), at, label }
  return { ...estimate, stageChanges: [...stageChanges, next].slice(-CAP) }
}

export function appendNote(estimate: Estimate, body: string, at: string): Estimate {
  const note = body.trim()
  if (!note) return estimate
  const entry: NoteEntry = { id: crypto.randomUUID(), at, body: note }
  return { ...estimate, noteLog: [...(estimate.noteLog ?? []), entry].slice(-CAP) }
}

export function recordStageChanges(before: ScopeState, after: ScopeState, at: string): ScopeState {
  let changed = false
  const estimates = after.estimates.map((estimate) => {
    const previous = before.estimates.find((item) => item.id === estimate.id)
    let next = estimate
    if (estimate.archived && !previous?.archived) {
      next = appendStageChange(next, "Archived", at)
    }
    const salesAfter = salesStageOf(estimate)
    const salesBefore = previous ? salesStageOf(previous) : null
    if (salesAfter && salesAfter !== salesBefore) {
      next = appendStageChange(next, `Moved to ${columnLabel(SALES_COLUMNS, salesAfter, after.columnLabels)}`, at)
    }
    const jobAfter = jobColumn(after, estimate)
    const jobBefore = previous ? jobColumn(before, previous) : null
    if (jobAfter && jobAfter !== jobBefore) {
      next = appendStageChange(next, `Moved to ${jobAfter}`, at)
    }
    if (next !== estimate) changed = true
    return next
  })
  if (!changed) return after
  return { ...after, estimates }
}

function jobColumn(state: ScopeState, estimate: Estimate): string | null {
  const stage = state.stages.find((item) => item.id === estimate.stageId)
  const order = state.workOrders.find((item) => item.estimateId === estimate.id)
  const column = jobStageOf(estimate, order, stage?.slug)
  if (!column) return null
  return columnLabel(JOB_COLUMNS, column, state.columnLabels)
}

function columnLabel(columns: { id: string; label: string }[], id: string, labels?: Record<string, string>): string {
  const renamed = labels?.[id]?.trim()
  if (renamed) return renamed
  return columns.find((column) => column.id === id)?.label ?? id
}
