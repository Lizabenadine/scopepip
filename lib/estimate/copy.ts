import type { AreaInput, LineItemInput } from "../types.ts"

function copiedName(name: string): string {
  const trimmed = name.trim()
  if (!trimmed) return "Copy"
  return `${trimmed} copy`
}

/** A second area with the same measurements and surfaces, and new ids. */
export function copyArea(area: AreaInput): AreaInput {
  return {
    ...area,
    id: crypto.randomUUID(),
    name: copiedName(area.name),
    surfaces: area.surfaces.map((surface) => ({ ...surface, id: crypto.randomUUID() })),
  }
}

/** A second line item with the same price, notes, and material rows, and new ids. */
export function copyLineItem(line: LineItemInput): LineItemInput {
  return {
    ...line,
    id: crypto.randomUUID(),
    label: copiedName(line.label),
    materials: (line.materials ?? []).map((material) => ({ ...material, id: crypto.randomUUID() })),
  }
}

export function insertAfter<T extends { id: string }>(items: T[], id: string, copy: T): T[] {
  const index = items.findIndex((item) => item.id === id)
  const next = items.slice()
  next.splice(index < 0 ? items.length : index + 1, 0, copy)
  return next
}
