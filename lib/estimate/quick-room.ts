import type { AreaInput, EstimateKind, SurfaceInput } from "../types.ts"
import { AREA_TEMPLATES, areaFromTemplate } from "./templates.ts"

function surface(rateId: string, coatCount: number, itemCount = 0): SurfaceInput {
  return {
    id: crypto.randomUUID(),
    rateId,
    coatCount,
    itemCount,
    quantityOverride: null,
    crewNote: "",
  }
}

/** A named room with the usual surfaces already on, so the price moves as the size is typed. */
export function quickRoom(name: string, kind: EstimateKind): AreaInput | null {
  const trimmed = name.trim()
  if (!trimmed) return null
  const lower = trimmed.toLowerCase()
  const known = AREA_TEMPLATES.find(
    (template) =>
      template.name.toLowerCase() === lower ||
      template.id.toLowerCase() === lower ||
      (lower === "soffits" && template.id === "soffit") ||
      (lower === "garage door" && template.id === "garage-doors") ||
      (lower === "gutter" && template.id === "gutters") ||
      (lower === "railing" && template.id === "railings") ||
      (lower === "fences" && template.id === "fence") ||
      (lower === "porches" && template.id === "porch") ||
      (lower === "entry door" && template.id === "entry-doors"),
  )
  if (known) return areaFromTemplate(known.id)
  if (kind === "exterior") {
    return {
      id: crypto.randomUUID(),
      name: trimmed,
      areaType: "surface",
      lengthFt: 0,
      widthFt: 0,
      heightFt: 0,
      crewNote: "",
      surfaces: [surface("siding", 2)],
    }
  }
  if (kind === "cabinets") {
    return {
      id: crypto.randomUUID(),
      name: trimmed,
      areaType: "surface",
      lengthFt: 0,
      widthFt: 0,
      heightFt: 0,
      crewNote: "",
      surfaces: [surface("cabinet-doors", 2, 0)],
    }
  }
  return {
    id: crypto.randomUUID(),
    name: trimmed,
    areaType: "room",
    lengthFt: 0,
    widthFt: 0,
    heightFt: 0,
    crewNote: "",
    surfaces: [surface("walls", 2), surface("ceiling", 2), surface("baseboards", 2)],
  }
}
