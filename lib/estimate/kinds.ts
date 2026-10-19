import type { EstimateKind, EstimateSettings, ProductionRate } from "../types.ts"

/** Rates with no explicit list follow the Paint Scout split: interior, exterior, or cabinets. */
export function rateKinds(rate: ProductionRate): EstimateKind[] {
  if (rate.estimateKinds && rate.estimateKinds.length > 0) return rate.estimateKinds
  if (rate.id === "cabinet-doors") return ["cabinets"]
  if (rate.id === "door-frame") return ["interior", "exterior"]
  if (rate.category === "Exterior") return ["exterior"]
  return ["interior"]
}

export function ratesForKind(rates: ProductionRate[], kind: EstimateKind): ProductionRate[] {
  return rates.filter((rate) => rateKinds(rate).includes(kind))
}

export function hourlyRateForKind(settings: EstimateSettings, kind: EstimateKind): number {
  const override = settings.typeHourlyRates?.[kind]
  if (typeof override === "number") return override
  return settings.generalHourlyRate ?? settings.hourlyRate
}

/** The estimate's hourlyRate is the active type, so every quote path prices the same number. */
export function selectEstimateKind(settings: EstimateSettings, kind: EstimateKind): EstimateSettings {
  const general = settings.generalHourlyRate ?? settings.hourlyRate
  return {
    ...settings,
    generalHourlyRate: general,
    hourlyRate: hourlyRateForKind({ ...settings, generalHourlyRate: general }, kind),
  }
}

export function setKindHourlyRate(settings: EstimateSettings, kind: EstimateKind, hourlyRate: number): EstimateSettings {
  const general = settings.generalHourlyRate ?? settings.hourlyRate
  return {
    ...settings,
    generalHourlyRate: general,
    typeHourlyRates: { ...settings.typeHourlyRates, [kind]: hourlyRate },
    hourlyRate,
  }
}
