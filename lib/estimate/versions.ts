import type { Estimate, EstimateVersion } from "../types.ts"

const MAX_VERSIONS = 20

type VersionSource = Pick<
  EstimateVersion,
  | "title"
  | "jobAddress"
  | "estimateKind"
  | "areas"
  | "areaGroups"
  | "lineItems"
  | "rates"
  | "settings"
  | "notes"
  | "crewNote"
  | "notesEs"
  | "crewNoteEs"
>

export function scopeSnapshot(source: VersionSource): VersionSource {
  return {
    title: source.title.trim() || "Interior repaint",
    jobAddress: source.jobAddress.trim(),
    estimateKind: source.estimateKind ?? "interior",
    areas: source.areas,
    areaGroups: source.areaGroups && source.areaGroups.length > 0 ? source.areaGroups : undefined,
    lineItems: source.lineItems,
    rates: source.rates,
    settings: source.settings,
    notes: source.notes.trim(),
    crewNote: source.crewNote.trim(),
    ...(source.notesEs?.trim() ? { notesEs: source.notesEs.trim() } : {}),
    ...(source.crewNoteEs?.trim() ? { crewNoteEs: source.crewNoteEs.trim() } : {}),
  }
}

function sameScope(left: VersionSource, right: VersionSource): boolean {
  return JSON.stringify(scopeSnapshot(left)) === JSON.stringify(scopeSnapshot(right))
}

/** Keep the previous scope when a save changes it. Identical saves do not add another copy. */
export function rememberVersion(
  versions: EstimateVersion[] | undefined,
  previous: VersionSource,
  incoming: VersionSource,
  now: string,
  id?: string,
): EstimateVersion[] | undefined {
  if (sameScope(previous, incoming)) return versions
  const prior = scopeSnapshot(previous)
  const list = versions ?? []
  if (list[0] && sameScope(list[0], prior)) return list
  const version: EstimateVersion = {
    id: id ?? `ver_${crypto.randomUUID()}`,
    savedAt: now,
    ...structuredClone(prior),
  }
  const next = [version, ...list]
  return next.length > MAX_VERSIONS ? next.slice(0, MAX_VERSIONS) : next
}

export function restoreVersion(
  estimate: Estimate,
  versionId: string,
  now: string,
): { ok: true; estimate: Estimate; restored: boolean } | { ok: false; reason: string } {
  const version = estimate.versions?.find((item) => item.id === versionId)
  if (!version) return { ok: false, reason: "That version is not on this estimate." }
  if (sameScope(estimate, version)) return { ok: true, estimate, restored: false }
  return {
    ok: true,
    restored: true,
    estimate: {
      ...estimate,
      ...structuredClone(scopeSnapshot(version)),
      versions: rememberVersion(estimate.versions, estimate, version, now),
      updatedAt: now,
    },
  }
}
