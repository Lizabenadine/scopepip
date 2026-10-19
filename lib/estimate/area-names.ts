import type { AreaInput } from "../types.ts"

export interface AreaName {
  id: string
  name: string
}

export const DEFAULT_AREA_NAMES: AreaName[] = [
  { id: "name-bedroom", name: "Bedroom" },
  { id: "name-primary-bedroom", name: "Primary bedroom" },
  { id: "name-bathroom", name: "Bathroom" },
  { id: "name-kitchen", name: "Kitchen" },
  { id: "name-living-room", name: "Living room" },
  { id: "name-dining-room", name: "Dining room" },
  { id: "name-hall", name: "Hall" },
  { id: "name-office", name: "Office" },
  { id: "name-laundry", name: "Laundry" },
  { id: "name-closet", name: "Closet" },
  { id: "name-east-wall", name: "East wall" },
  { id: "name-porch", name: "Porch" },
  { id: "name-front-door", name: "Front door" },
  { id: "name-deck", name: "Deck" },
  { id: "name-garage", name: "Garage" },
]

export function moveAreaName(names: AreaName[], id: string, direction: -1 | 1): AreaName[] {
  const index = names.findIndex((item) => item.id === id)
  const target = index + direction
  if (index < 0 || target < 0 || target >= names.length) return names
  const next = names.slice()
  const [item] = next.splice(index, 1)
  next.splice(target, 0, item!)
  return next
}

export function renameAreaName(names: AreaName[], id: string, name: string): AreaName[] {
  return names.map((item) => (item.id === id ? { ...item, name } : item))
}

export function addAreaName(names: AreaName[], name: string): AreaName[] | null {
  const trimmed = name.trim()
  if (!trimmed) return null
  if (names.some((item) => item.name.trim().toLowerCase() === trimmed.toLowerCase())) return null
  return [...names, { id: crypto.randomUUID(), name: trimmed }]
}

export function removeAreaName(names: AreaName[], id: string): AreaName[] {
  return names.filter((item) => item.id !== id)
}

/** A saved name starts an empty room. Dimensions and surfaces stay on the templates. */
export function areaFromName(name: string): AreaInput {
  return {
    id: crypto.randomUUID(),
    name: name.trim() || "Room",
    areaType: "room",
    lengthFt: 0,
    widthFt: 0,
    heightFt: 8,
    crewNote: "",
    surfaces: [],
  }
}
