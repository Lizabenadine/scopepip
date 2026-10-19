import { documentedBedroom } from "../defaults.ts"
import type { AreaInput, AreaType, SurfaceInput } from "../types.ts"

export const ESTIMATE_KINDS = ["interior", "exterior", "cabinets"] as const

export type EstimateKind = (typeof ESTIMATE_KINDS)[number]

export const ESTIMATE_KIND_LABEL: Record<EstimateKind, string> = {
  interior: "Interior",
  exterior: "Exterior",
  cabinets: "Cabinets",
}

interface TemplateSurface {
  rateId: string
  coatCount: number
  itemCount: number
}

export interface AreaTemplate {
  id: string
  kind: EstimateKind
  name: string
  summary: string
  areaType: AreaType
  lengthFt: number
  widthFt: number
  heightFt: number
  surfaces: TemplateSurface[]
}

export interface EstimateTemplate {
  id: string
  kind: EstimateKind
  name: string
  summary: string
  title: string
  areaIds: string[]
}

function coats(rateId: string, coatCount: number, itemCount = 0): TemplateSurface {
  return { rateId, coatCount, itemCount }
}

const bedroom = documentedBedroom()

export const AREA_TEMPLATES: AreaTemplate[] = [
  {
    id: "bedroom",
    kind: "interior",
    name: bedroom.name,
    summary: "Walls, ceiling, baseboards, 2 windows, 1 door · 12×15×8",
    areaType: bedroom.areaType,
    lengthFt: bedroom.lengthFt,
    widthFt: bedroom.widthFt,
    heightFt: bedroom.heightFt,
    surfaces: bedroom.surfaces.map((surface) => ({
      rateId: surface.rateId,
      coatCount: surface.coatCount,
      itemCount: surface.itemCount,
    })),
  },
  room("primary-bedroom", "Primary bedroom", "Walls, ceiling, baseboards, 3 windows, 2 doors · 14×16×9", 14, 16, 9, [
    coats("walls", 2),
    coats("ceiling", 2),
    coats("baseboards", 2),
    coats("window-frames", 2, 3),
    coats("door-frame", 2, 2),
  ]),
  room("bathroom", "Bathroom", "Walls, ceiling, baseboards, 1 window, 1 door · 5×8×8", 5, 8, 8, [
    coats("walls", 2),
    coats("ceiling", 2),
    coats("baseboards", 2),
    coats("window-frames", 2, 1),
    coats("door-frame", 2, 1),
  ]),
  room("kitchen", "Kitchen", "Walls, ceiling, baseboards, 2 windows, 1 door · 12×10×8", 12, 10, 8, [
    coats("walls", 2),
    coats("ceiling", 2),
    coats("baseboards", 2),
    coats("window-frames", 2, 2),
    coats("door-frame", 2, 1),
  ]),
  room("living-room", "Living room", "Walls, ceiling, baseboards, 3 windows, 2 doors · 18×14×9", 18, 14, 9, [
    coats("walls", 2),
    coats("ceiling", 2),
    coats("baseboards", 2),
    coats("window-frames", 2, 3),
    coats("door-frame", 2, 2),
  ]),
  room("dining-room", "Dining room", "Walls, ceiling, baseboards, 2 windows, 1 door · 12×14×9", 12, 14, 9, [
    coats("walls", 2),
    coats("ceiling", 2),
    coats("baseboards", 2),
    coats("window-frames", 2, 2),
    coats("door-frame", 2, 1),
  ]),
  room("hall", "Hall", "Walls, ceiling, baseboards, 2 doors · 16×4×8", 16, 4, 8, [
    coats("walls", 2),
    coats("ceiling", 2),
    coats("baseboards", 2),
    coats("door-frame", 2, 2),
  ]),
  room("office", "Office", "Walls, ceiling, baseboards, 1 window, 1 door · 10×12×8", 10, 12, 8, [
    coats("walls", 2),
    coats("ceiling", 2),
    coats("baseboards", 2),
    coats("window-frames", 2, 1),
    coats("door-frame", 2, 1),
  ]),
  room("laundry", "Laundry", "Walls, ceiling, 1 door · 6×8×8", 6, 8, 8, [
    coats("walls", 2),
    coats("ceiling", 2),
    coats("door-frame", 2, 1),
  ]),
  room("closet", "Closet", "Walls · 4×6×8", 4, 6, 8, [coats("walls", 2)]),
  {
    id: "accent-wall",
    kind: "interior",
    name: "Accent wall",
    summary: "One accent wall · 12×8",
    areaType: "surface",
    lengthFt: 12,
    widthFt: 0,
    heightFt: 8,
    surfaces: [coats("accent", 2)],
  },
  {
    id: "house-wall",
    kind: "exterior",
    name: "House wall",
    summary: "Siding on one elevation · 30×10",
    areaType: "surface",
    lengthFt: 30,
    widthFt: 0,
    heightFt: 10,
    surfaces: [coats("siding", 2)],
  },
  {
    id: "fascia",
    kind: "exterior",
    name: "Fascia",
    summary: "Fascia · 80 ln ft",
    areaType: "surface",
    lengthFt: 80,
    widthFt: 0,
    heightFt: 0,
    surfaces: [coats("fascia", 2)],
  },
  {
    id: "soffit",
    kind: "exterior",
    name: "Soffit",
    summary: "Soffit · 80×2",
    areaType: "surface",
    lengthFt: 80,
    widthFt: 0,
    heightFt: 2,
    surfaces: [coats("soffit", 2)],
  },
  {
    id: "porch-ceiling",
    kind: "exterior",
    name: "Porch ceiling",
    summary: "Porch ceiling · 16×8",
    areaType: "surface",
    lengthFt: 16,
    widthFt: 0,
    heightFt: 8,
    surfaces: [coats("soffit", 2)],
  },
  {
    id: "shutters",
    kind: "exterior",
    name: "Shutters",
    summary: "6 shutters",
    areaType: "surface",
    lengthFt: 0,
    widthFt: 0,
    heightFt: 0,
    surfaces: [coats("shutters", 2, 6)],
  },
  {
    id: "front-door",
    kind: "exterior",
    name: "Front door",
    summary: "1 door and frame",
    areaType: "surface",
    lengthFt: 0,
    widthFt: 0,
    heightFt: 0,
    surfaces: [coats("door-frame", 2, 1)],
  },
  {
    id: "deck",
    kind: "exterior",
    name: "Deck",
    summary: "Deck stain · 12×20",
    areaType: "surface",
    lengthFt: 12,
    widthFt: 20,
    heightFt: 0,
    surfaces: [coats("deck", 2)],
  },
  {
    id: "kitchen-cabinets",
    kind: "cabinets",
    name: "Kitchen cabinets",
    summary: "18 cabinet doors",
    areaType: "surface",
    lengthFt: 0,
    widthFt: 0,
    heightFt: 0,
    surfaces: [coats("cabinet-doors", 2, 18)],
  },
  {
    id: "bathroom-vanity",
    kind: "cabinets",
    name: "Bathroom vanity",
    summary: "4 cabinet doors",
    areaType: "surface",
    lengthFt: 0,
    widthFt: 0,
    heightFt: 0,
    surfaces: [coats("cabinet-doors", 2, 4)],
  },
]

export const ESTIMATE_TEMPLATES: EstimateTemplate[] = [
  {
    id: "interior-repaint",
    kind: "interior",
    name: "Interior repaint",
    summary: "Living room, kitchen, bedroom, bathroom, and hall",
    title: "Interior repaint",
    areaIds: ["living-room", "kitchen", "bedroom", "bathroom", "hall"],
  },
  {
    id: "bedrooms",
    kind: "interior",
    name: "Bedrooms and hall",
    summary: "Primary bedroom, bedroom, and hall",
    title: "Bedroom repaint",
    areaIds: ["primary-bedroom", "bedroom", "hall"],
  },
  {
    id: "exterior-repaint",
    kind: "exterior",
    name: "Exterior repaint",
    summary: "Siding, fascia, soffit, shutters, and the front door",
    title: "Exterior repaint",
    areaIds: ["house-wall", "fascia", "soffit", "shutters", "front-door"],
  },
  {
    id: "cabinet-refinish",
    kind: "cabinets",
    name: "Cabinet refinish",
    summary: "Kitchen cabinets and the bathroom vanity",
    title: "Cabinet refinish",
    areaIds: ["kitchen-cabinets", "bathroom-vanity"],
  },
]

export function areaTemplatesFor(kind: EstimateKind): AreaTemplate[] {
  return AREA_TEMPLATES.filter((template) => template.kind === kind)
}

export function estimateTemplatesFor(kind: EstimateKind): EstimateTemplate[] {
  return ESTIMATE_TEMPLATES.filter((template) => template.kind === kind)
}

export function areaFromTemplate(templateId: string): AreaInput | null {
  const template = AREA_TEMPLATES.find((item) => item.id === templateId)
  if (!template) return null
  return {
    id: crypto.randomUUID(),
    name: template.name,
    areaType: template.areaType,
    lengthFt: template.lengthFt,
    widthFt: template.widthFt,
    heightFt: template.heightFt,
    crewNote: "",
    surfaces: template.surfaces.map(surfaceFromTemplate),
  }
}

export function areasFromEstimateTemplate(templateId: string): AreaInput[] {
  const template = ESTIMATE_TEMPLATES.find((item) => item.id === templateId)
  if (!template) return []
  return template.areaIds.flatMap((areaId) => {
    const area = areaFromTemplate(areaId)
    return area ? [area] : []
  })
}

export function estimateTemplateById(templateId: string): EstimateTemplate | null {
  return ESTIMATE_TEMPLATES.find((item) => item.id === templateId) ?? null
}

function surfaceFromTemplate(surface: TemplateSurface): SurfaceInput {
  return {
    id: crypto.randomUUID(),
    rateId: surface.rateId,
    coatCount: surface.coatCount,
    itemCount: surface.itemCount,
    quantityOverride: null,
    crewNote: "",
  }
}

function room(
  id: string,
  name: string,
  summary: string,
  lengthFt: number,
  widthFt: number,
  heightFt: number,
  surfaces: TemplateSurface[],
): AreaTemplate {
  return {
    id,
    kind: "interior",
    name,
    summary,
    areaType: "room",
    lengthFt,
    widthFt,
    heightFt,
    surfaces,
  }
}
