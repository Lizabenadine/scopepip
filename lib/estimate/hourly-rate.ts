import type { HourlyRateBuild } from "../types.ts"

export type BuiltHourlyRate = { ok: true; hourlyRate: number } | { ok: false; reason: string }

/**
 * Profit is a share of the selling rate, not a markup on cost.
 * $53.75 of cost at a 10% margin is 53.75 / 0.90.
 */
export function buildHourlyRate(input: HourlyRateBuild): BuiltHourlyRate {
  const labor = input.laborCostPerHour
  const overhead = input.overheadPerHour
  const sundries = input.sundriesPerHour
  const profit = input.profitPercent
  if (![labor, overhead, sundries, profit].every((value) => Number.isFinite(value))) {
    return { ok: false, reason: "Enter numbers for labor, overhead, paint, and profit." }
  }
  if (labor < 0 || overhead < 0 || sundries < 0) {
    return { ok: false, reason: "Labor, overhead, and paint stay at 0 or more." }
  }
  if (profit < 0 || profit >= 100) {
    return { ok: false, reason: "Profit has to stay under 100%." }
  }
  const cost = labor + overhead + sundries
  if (cost === 0) return { ok: false, reason: "Add a labor cost or an overhead cost." }
  const hourlyRate = Math.round((cost / (1 - profit / 100)) * 100) / 100
  return { ok: true, hourlyRate }
}
