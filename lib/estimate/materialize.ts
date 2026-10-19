import type { EstimateQuote } from "./calculate.ts"

export interface MaterializedRow {
  id: string
  estimateId: string
  sortOrder: number
  description: string
  quantity: number
  unit: string
  coats: number
  allocatedHours: number
  paintGallons: number
  price: number
}

/** Rows a Supabase save would write for surfaces and line items. */
export function materializeLineItems(estimateId: string, quote: EstimateQuote): MaterializedRow[] {
  const surfaces = quote.areas.flatMap((area) =>
    area.surfaces.map((surface) => ({
      id: `${estimateId}:${area.id}:${surface.id}`,
      estimateId,
      sortOrder: 0,
      description: surface.clientLabel,
      quantity: surface.quantity,
      unit: surface.quantityUnit,
      coats: surface.coatCount,
      allocatedHours: surface.allocatedHours,
      paintGallons: surface.paintGallons,
      price: surface.price,
    })),
  )
  const lines = quote.lineItems.map((line) => ({
    id: line.id,
    estimateId,
    sortOrder: 0,
    description: line.label,
    quantity: 1,
    unit: line.mode,
    coats: 0,
    allocatedHours: line.allocatedHours,
    paintGallons: 0,
    price: line.price,
  }))
  return [...surfaces, ...lines].map((row, sortOrder) => ({ ...row, sortOrder }))
}
