import { PAYMENT_METHODS } from "../defaults.ts"
import { calculateEstimate, type PricedArea, type PricedLine, type PricedSurface } from "../estimate/calculate.ts"
import type { Client, Estimate, PrepLevel, SitePhoto, WorkOrder } from "../types.ts"

export interface CrewSurface {
  id: string
  internalLabel: string
  quantityLabel: string
  primerCoats: number
  finishCoats: number
  allocatedHours: number
  paintGallons: number
  productName: string
  crewNote: string
}

export interface CrewArea {
  id: string
  name: string
  dimensionLabel: string
  prepLevel: PrepLevel
  accessFactor: number
  prepNote: string
  allocatedHours: number
  surfaces: CrewSurface[]
}

export interface CrewLine {
  id: string
  label: string
  crewNote: string
  allocatedHours: number
}

/** Signed extra work on the crew sheet. The amount stays on the invoice. */
export interface CrewChangeOrder {
  id: string
  description: string
  signedAt: string
}

/** Crew copy. Dollar fields never enter this object. */
export interface CrewSheet {
  estimateId: string
  title: string
  clientName: string
  phone: string
  email: string
  address: string
  scheduledOn: string | null
  crewNote: string
  areas: CrewArea[]
  lineItems: CrewLine[]
  changeOrders: CrewChangeOrder[]
  allocatedHours: number
  paintGallons: number
  hourDisplay: WorkOrder["hourDisplay"]
  checklist: WorkOrder["checklist"]
  photos: SitePhoto[]
}

export function crewSheetAllowed(stageSlug: string | undefined): boolean {
  return stageSlug === "scheduled" || stageSlug === "completed"
}

function surfaceRow(surface: PricedSurface): CrewSurface {
  return {
    id: surface.id,
    internalLabel: surface.internalLabel,
    quantityLabel: `${surface.quantity} ${surface.quantityUnit}`,
    primerCoats: surface.primerCoats,
    finishCoats: surface.coatCount,
    allocatedHours: surface.allocatedHours,
    paintGallons: surface.paintGallons,
    productName: surface.productName,
    crewNote: surface.crewNote,
  }
}

function prepNote(area: PricedArea): string {
  const notes: string[] = []
  if (area.prepLevel !== "none") {
    notes.push(`${area.prepLevel[0].toUpperCase()}${area.prepLevel.slice(1)} prep`)
  }
  if (area.accessFactor > 1) notes.push("High access")
  if (area.crewNote) notes.push(area.crewNote)
  return notes.join(" · ")
}

function areaRow(area: PricedArea): CrewArea {
  const size =
    area.areaType === "surface"
      ? `${area.lengthFt} ft × ${area.heightFt} ft`
      : `${area.lengthFt} × ${area.widthFt} × ${area.heightFt} ft`
  return {
    id: area.id,
    name: area.name,
    dimensionLabel: size,
    prepLevel: area.prepLevel,
    accessFactor: area.accessFactor,
    prepNote: prepNote(area),
    allocatedHours: area.allocatedHours,
    surfaces: area.surfaces.map(surfaceRow),
  }
}

function lineRow(line: PricedLine): CrewLine {
  return {
    id: line.id,
    label: line.label,
    crewNote: line.crewNote,
    allocatedHours: line.allocatedHours,
  }
}

export function toCrewSheet(
  estimate: Estimate,
  client: Client | undefined,
  workOrder: WorkOrder,
): CrewSheet {
  const quote = calculateEstimate({
    areas: estimate.areas,
    lineItems: estimate.lineItems,
    rates: estimate.rates,
    settings: estimate.settings,
    paymentMethods: PAYMENT_METHODS,
  })
  const changeOrderItemIds = new Set(
    (estimate.changeOrders ?? []).flatMap((order) => order.items.map((item) => item.id)),
  )
  return {
    estimateId: estimate.id,
    title: estimate.title,
    clientName: client?.name ?? "Client",
    phone: client?.phone ?? "",
    email: client?.email ?? "",
    address: estimate.jobAddress || client?.address || "",
    scheduledOn: estimate.scheduledOn,
    crewNote: workOrder.prepNotes,
    areas: quote.areas.map(areaRow),
    lineItems: quote.lineItems
      .filter((line) => !line.hiddenOnWorkOrder && !changeOrderItemIds.has(line.id))
      .map(lineRow),
    changeOrders: (estimate.changeOrders ?? []).map((order) => ({
      id: order.id,
      description: order.items
        .map((item) => item.label.trim())
        .filter(Boolean)
        .join(", ") || "Extra work",
      signedAt: order.createdAt,
    })),
    allocatedHours:
      quote.allocatedHours -
      quote.lineItems
        .filter((line) => line.hiddenOnWorkOrder)
        .reduce((sum, line) => sum + line.allocatedHours, 0),
    paintGallons: quote.paintGallons,
    hourDisplay: workOrder.hourDisplay,
    checklist: workOrder.checklist,
    photos: workOrder.photos,
  }
}
