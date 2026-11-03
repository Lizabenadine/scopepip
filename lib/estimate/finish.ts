import type { AreaInput } from "../types.ts"

/** Rooms that still need a color and a sheen before the proposal goes out. */
export function roomsMissingColor(areas: AreaInput[]): string[] {
  return areas
    .filter((area) => area.surfaces.length > 0)
    .filter((area) => !area.colorName?.trim() || !area.sheen?.trim())
    .map((area) => area.name.trim() || "Room")
}
