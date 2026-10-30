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
  const known = AREA_TEMPLATES.find(
    (template) => template.kind === kind && template.name.toLowerCase() === trimmed.toLowerCase(),
  )
  if (known) return areaFromTemplate(known.id)
  if (kind === "exterior") {
    return {
      id: crypto.randomUUID(),
      name: trimmed,
      areaType: "surface",
      lengthFt: 0,
      widthFt: 0,
      heightFt: 10,
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
      surfaces: [surface("cabinet-doors", 2, 1)],
    }
  }
  return {
    id: crypto.randomUUID(),
    name: trimmed,
    areaType: "room",
    lengthFt: 0,
    widthFt: 0,
    heightFt: 8,
    crewNote: "",
    surfaces: [surface("walls", 2), surface("ceiling", 2), surface("baseboards", 2), surface("door-frame", 2, 1)],
  }
}
