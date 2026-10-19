import type { PhotoLinkKind, PhotoTag } from "../types.ts"

export interface PhotoScopeArea {
  id: string
  name: string
  crewNote: string
  prepLevel?: string
}

export interface PhotoScopeLine {
  id: string
  label: string
  crewNote: string
  selected?: boolean
}

export interface PhotoScope {
  areas: PhotoScopeArea[]
  lineItems: PhotoScopeLine[]
  prepNotes: string
}

export interface PhotoLink {
  kind: PhotoLinkKind
  id: string | null
  label: string
  detail: string
}

export const PHOTO_TAG_LABELS: Record<PhotoTag, string> = {
  before: "Before",
  in_progress: "In progress",
  after: "After",
  prep_concern: "Prep concern",
  touch_up: "Touch-up",
}

export function autoLink(tag: PhotoTag, scope: PhotoScope): PhotoLink {
  if (tag === "prep_concern") {
    const area = areaForPrep(scope)
    return {
      kind: "prep",
      id: area?.id ?? null,
      label: area ? `Prep · ${area.name}` : "Prep notes",
      detail: prepDetail(area, scope.prepNotes),
    }
  }
  if (tag === "touch_up") {
    const line = scope.lineItems.find((item) => item.selected !== false)
    return {
      kind: "line",
      id: line?.id ?? null,
      label: line?.label ?? "Touch-up",
      detail: line?.crewNote || scope.prepNotes || "No line item on this job.",
    }
  }
  const area = scope.areas.length === 1 ? scope.areas[0] : scope.areas[0]
  return {
    kind: "area",
    id: area?.id ?? null,
    label: area?.name ?? "Whole job",
    detail: area?.crewNote || "",
  }
}

export function describeLink(
  link: { kind: PhotoLinkKind | null; id: string | null },
  scope: PhotoScope,
): PhotoLink {
  if (link.kind === "prep") {
    const area = scope.areas.find((item) => item.id === link.id)
    return {
      kind: "prep",
      id: link.id,
      label: area ? `Prep · ${area.name}` : "Prep notes",
      detail: prepDetail(area, scope.prepNotes),
    }
  }
  if (link.kind === "line") {
    const line = scope.lineItems.find((item) => item.id === link.id)
    return {
      kind: "line",
      id: link.id,
      label: line?.label ?? "Line item",
      detail: line?.crewNote || "",
    }
  }
  const area = scope.areas.find((item) => item.id === link.id)
  return {
    kind: "area",
    id: link.id,
    label: area?.name ?? "Whole job",
    detail: area?.crewNote || "",
  }
}

export function linkChoices(scope: PhotoScope): PhotoLink[] {
  const prep = autoLink("prep_concern", scope)
  const areas = scope.areas.map((area) => ({
    kind: "area" as const,
    id: area.id,
    label: area.name,
    detail: area.crewNote,
  }))
  const lines = scope.lineItems
    .filter((item) => item.selected !== false)
    .map((item) => ({
      kind: "line" as const,
      id: item.id,
      label: item.label,
      detail: item.crewNote,
    }))
  return [prep, ...areas, ...lines]
}

export function linkKey(link: { kind: PhotoLinkKind | null; id: string | null }): string {
  return `${link.kind ?? "area"}:${link.id ?? ""}`
}

function areaForPrep(scope: PhotoScope): PhotoScopeArea | undefined {
  const prepped = scope.areas.find((item) => item.prepLevel && item.prepLevel !== "none")
  if (prepped) return prepped
  const note = scope.prepNotes.toLowerCase()
  const named = scope.areas.find((item) => note.includes(item.name.toLowerCase()))
  return named ?? scope.areas[0]
}

function prepDetail(area: PhotoScopeArea | undefined, prepNotes: string): string {
  const notes: string[] = []
  if (area?.prepLevel && area.prepLevel !== "none") {
    notes.push(`${area.prepLevel[0]?.toUpperCase() ?? ""}${area.prepLevel.slice(1)} prep`)
  }
  if (area?.crewNote) notes.push(area.crewNote)
  if (notes.length === 0 && prepNotes) notes.push(prepNotes)
  return notes.join(" · ") || "No prep note yet."
}
