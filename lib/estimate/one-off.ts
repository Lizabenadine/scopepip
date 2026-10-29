import type { AreaInput, EstimateKind, ProductionRate, RateBasis, SurfaceInput, SurfaceMeasure } from "../types.ts"

export const ONE_OFF_BASES: { id: RateBasis; label: string; speedLabel: string }[] = [
  { id: "sqft_per_hour", label: "Square feet per hour", speedLabel: "Sq ft per hour" },
  { id: "lnft_per_hour", label: "Linear feet per hour", speedLabel: "Ln ft per hour" },
  { id: "hours_per_item", label: "Hours each", speedLabel: "Hours each" },
  { id: "dollars_per_sqft", label: "Dollars per square foot", speedLabel: "Dollars per sq ft" },
  { id: "dollars_per_lnft", label: "Dollars per linear foot", speedLabel: "Dollars per ln ft" },
  { id: "dollars_per_item", label: "Dollars each", speedLabel: "Dollars each" },
]

const MEASURE: Record<RateBasis, SurfaceMeasure> = {
  sqft_per_hour: "accent",
  dollars_per_sqft: "accent",
  lnft_per_hour: "trim",
  dollars_per_lnft: "trim",
  hours_per_item: "items",
  dollars_per_item: "items",
}

const COVERAGE: Record<RateBasis, number> = {
  sqft_per_hour: 350,
  dollars_per_sqft: 350,
  lnft_per_hour: 650,
  dollars_per_lnft: 650,
  hours_per_item: 0,
  dollars_per_item: 0,
}

export function createOneOffRate(input: {
  label: string
  basis: RateBasis
  speed: number
  kind: EstimateKind
}): ProductionRate | null {
  const label = input.label.trim()
  if (!label) return null
  if (!Number.isFinite(input.speed) || input.speed <= 0) return null
  return {
    id: crypto.randomUUID(),
    category: "This job",
    internalLabel: label,
    clientLabel: label,
    basis: input.basis,
    measure: MEASURE[input.basis],
    coatRates: [{ coats: 1, value: input.speed }],
    coveragePerCoat: COVERAGE[input.basis],
    primerRate: 0,
    primerCoveragePerCoat: 0,
    productName: label,
    productCostPerGallon: 0,
    clientDescription: "Priced for this job only.",
    crewNote: "",
    hideFromCustomer: false,
    showCoats: true,
    showPrice: false,
    customHourlyRate: null,
    estimateKinds: [input.kind],
    oneOff: true,
  }
}

export function surfaceForOneOff(rate: ProductionRate): SurfaceInput {
  return {
    id: crypto.randomUUID(),
    rateId: rate.id,
    coatCount: 1,
    itemCount: rate.measure === "items" || rate.measure === "shutters" ? 1 : 0,
    quantityOverride: null,
    hoursOverride: null,
    crewNote: "",
  }
}

export function attachOneOffRate(
  areas: AreaInput[],
  areaId: string,
  rates: ProductionRate[],
  rate: ProductionRate,
): { areas: AreaInput[]; rates: ProductionRate[] } {
  return {
    rates: rates.some((item) => item.id === rate.id) ? rates : [...rates, rate],
    areas: areas.map((area) => {
      if (area.id !== areaId) return area
      if (area.surfaces.some((surface) => surface.rateId === rate.id)) return area
      return { ...area, surfaces: [...area.surfaces, surfaceForOneOff(rate)] }
    }),
  }
}

/** Turning a one-off surface off removes that rate once no room still uses it. */
export function detachRateSurface(
  areas: AreaInput[],
  areaId: string,
  rates: ProductionRate[],
  rateId: string,
): { areas: AreaInput[]; rates: ProductionRate[] } {
  const nextAreas = areas.map((area) =>
    area.id === areaId
      ? { ...area, surfaces: area.surfaces.filter((surface) => surface.rateId !== rateId) }
      : area,
  )
  const rate = rates.find((item) => item.id === rateId)
  const stillUsed = nextAreas.some((area) => area.surfaces.some((surface) => surface.rateId === rateId))
  return {
    areas: nextAreas,
    rates: rate?.oneOff && !stillUsed ? rates.filter((item) => item.id !== rateId) : rates,
  }
}
