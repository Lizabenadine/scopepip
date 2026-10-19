import type { AreaGroup, AreaInput } from "../types.ts"

export interface AreaSection<T> {
  groupId: string | null
  groupName: string | null
  items: T[]
}

export function createAreaGroup(name: string): AreaGroup | null {
  const trimmed = name.trim()
  if (!trimmed) return null
  return { id: crypto.randomUUID(), name: trimmed }
}

export function renameAreaGroup(groups: AreaGroup[], id: string, name: string): AreaGroup[] {
  return groups.map((group) => (group.id === id ? { ...group, name } : group))
}

export function moveAreaGroup(groups: AreaGroup[], id: string, direction: -1 | 1): AreaGroup[] {
  const index = groups.findIndex((group) => group.id === id)
  const target = index + direction
  if (index < 0 || target < 0 || target >= groups.length) return groups
  const next = groups.slice()
  const [group] = next.splice(index, 1)
  next.splice(target, 0, group!)
  return next
}

export function placeArea(areas: AreaInput[], areaId: string, groupId: string | null): AreaInput[] {
  return areas.map((area) => {
    if (area.id !== areaId) return area
    if (!groupId) {
      if (area.groupId === undefined) return area
      const next = { ...area }
      delete next.groupId
      return next
    }
    return { ...area, groupId }
  })
}

/** Removing a group leaves its rooms on the estimate, outside every group. */
export function removeAreaGroup(
  groups: AreaGroup[],
  areas: AreaInput[],
  id: string,
): { groups: AreaGroup[]; areas: AreaInput[] } {
  return {
    groups: groups.filter((group) => group.id !== id),
    areas: areas.map((area) => {
      if (area.groupId !== id) return area
      const next = { ...area }
      delete next.groupId
      return next
    }),
  }
}

/**
 * Ungrouped areas stay first, in estimate order. Groups follow the saved group
 * order, and the areas inside a group keep their estimate order.
 */
export function sectionByGroup<T extends { id: string }>(
  items: T[],
  groups: AreaGroup[] | undefined,
  groupIdFor: (item: T) => string | null | undefined,
  options?: { includeEmpty?: boolean },
): AreaSection<T>[] {
  const known = new Map((groups ?? []).map((group) => [group.id, group]))
  const ungrouped: T[] = []
  const byGroup = new Map<string, T[]>()
  for (const item of items) {
    const groupId = groupIdFor(item) || null
    if (!groupId || !known.has(groupId)) {
      ungrouped.push(item)
      continue
    }
    const list = byGroup.get(groupId) ?? []
    list.push(item)
    byGroup.set(groupId, list)
  }

  const sections: AreaSection<T>[] = []
  if (ungrouped.length > 0 || (groups ?? []).length === 0) {
    sections.push({ groupId: null, groupName: null, items: ungrouped })
  }
  for (const group of groups ?? []) {
    const grouped = byGroup.get(group.id) ?? []
    if (grouped.length === 0 && !options?.includeEmpty) continue
    sections.push({
      groupId: group.id,
      groupName: group.name.trim() || "Group",
      items: grouped,
    })
  }
  return sections
}
