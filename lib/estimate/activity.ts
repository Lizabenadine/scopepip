import { moneyExact } from "../format.ts"
import type { Estimate, EstimateActivity } from "../types.ts"
import { scopeSnapshot } from "./versions.ts"

const CAP = 40

type ScopeSource = Parameters<typeof scopeSnapshot>[0]

export function describeScopeChange(
  previous: ScopeSource,
  incoming: ScopeSource,
  previousTotal: number,
  nextTotal: number,
): string | null {
  const before = scopeSnapshot(previous)
  const after = scopeSnapshot(incoming)
  const parts: string[] = []
  if (before.title !== after.title) parts.push(`Title is now ${after.title}.`)
  if (before.jobAddress !== after.jobAddress) parts.push(`Address is now ${after.jobAddress || "blank"}.`)
  const addedAreas = named(after.areas, before.areas, "name")
  const removedAreas = named(before.areas, after.areas, "name")
  if (addedAreas) parts.push(`Added ${addedAreas}.`)
  if (removedAreas) parts.push(`Removed ${removedAreas}.`)
  const addedLines = named(after.lineItems, before.lineItems, "label")
  const removedLines = named(before.lineItems, after.lineItems, "label")
  if (addedLines) parts.push(`Added ${addedLines}.`)
  if (removedLines) parts.push(`Removed ${removedLines}.`)
  if (before.settings.hourlyRate !== after.settings.hourlyRate) {
    parts.push(`Hourly rate is now ${moneyExact(after.settings.hourlyRate)}.`)
  }
  if (cents(previousTotal) !== cents(nextTotal)) parts.push(`Price is now ${moneyExact(nextTotal)}.`)
  if (before.notes !== after.notes) parts.push("Updated the client note.")
  if (before.crewNote !== after.crewNote) parts.push("Updated the crew note.")
  if (parts.length === 0) return null
  return parts.join(" ")
}

export function restoredLabel(title: string): string {
  return `Restored ${title.trim() || "Interior repaint"}.`
}

export function rememberActivity(
  activity: EstimateActivity[] | undefined,
  label: string,
  at: string,
  id?: string,
): EstimateActivity[] {
  const entry: EstimateActivity = { id: id ?? `act_${crypto.randomUUID()}`, at, label }
  return [...(activity ?? []), entry].slice(-CAP)
}

export function listActivity(estimate: Estimate): EstimateActivity[] {
  const rows: EstimateActivity[] = [
    { id: `created-${estimate.id}`, at: estimate.createdAt, label: "Created." },
    ...(estimate.stageChanges ?? []).map((change) => ({ id: change.id, at: change.at, label: change.label })),
    ...(estimate.noteLog ?? []).map((note) => ({ id: note.id, at: note.at, label: `Note: ${note.body}` })),
    ...(estimate.activity ?? []),
  ]
  return rows.sort((left, right) => right.at.localeCompare(left.at) || right.id.localeCompare(left.id))
}

function named(
  next: { id: string; name?: string; label?: string }[],
  previous: { id: string }[],
  field: "name" | "label",
): string {
  const ids = new Set(previous.map((item) => item.id))
  const labels = next
    .filter((item) => !ids.has(item.id))
    .map((item) => (field === "name" ? item.name : item.label)?.trim() || "Untitled")
  return labels.join(", ")
}

function cents(value: number): number {
  return Math.round((Number.isFinite(value) ? value : 0) * 100)
}
