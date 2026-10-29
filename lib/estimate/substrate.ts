import { WALL_SUBSTRATE_RATES } from "../defaults.ts"
import type { AreaInput, ProductionRate, Substrate, SurfaceInput } from "../types.ts"
import { SUBSTRATES } from "../types.ts"
import { withCurrentRates } from "./saved-templates.ts"

export const SUBSTRATE_LABEL: Record<Substrate, string> = {
  drywall: "Drywall",
  wood: "Wood",
  masonry: "Masonry",
  metal: "Metal",
}

export function substrateOf(rate: ProductionRate): Substrate {
  return rate.substrate ?? "drywall"
}

export function substrateGroup(rate: ProductionRate): string {
  return rate.substrateGroup ?? rate.id
}

/** One toggle per surface. Wood, masonry, and metal are reached from the substrate control. */
export function surfaceHeads(rates: ProductionRate[]): ProductionRate[] {
  const grouped = new Map<string, ProductionRate[]>()
  for (const rate of rates) {
    const group = substrateGroup(rate)
    const members = grouped.get(group) ?? []
    members.push(rate)
    grouped.set(group, members)
  }
  const seen = new Set<string>()
  const heads: ProductionRate[] = []
  for (const rate of rates) {
    const group = substrateGroup(rate)
    if (seen.has(group)) continue
    seen.add(group)
    const members = grouped.get(group) ?? [rate]
    heads.push(members.find((item) => substrateOf(item) === "drywall") ?? members[0]!)
  }
  return heads
}

export function substrateChoices(rates: ProductionRate[], head: ProductionRate): Substrate[] {
  const group = substrateGroup(head)
  const present = new Set(
    rates.filter((rate) => substrateGroup(rate) === group).map((rate) => substrateOf(rate)),
  )
  return SUBSTRATES.filter((substrate) => present.has(substrate))
}

export function rateForSubstrate(
  rates: ProductionRate[],
  current: ProductionRate,
  substrate: Substrate,
): ProductionRate {
  const group = substrateGroup(current)
  return (
    rates.find((rate) => substrateGroup(rate) === group && substrateOf(rate) === substrate) ?? current
  )
}

export function sameSubstrateGroup(
  rates: ProductionRate[],
  surface: SurfaceInput,
  head: ProductionRate,
): boolean {
  const current = rates.find((rate) => rate.id === surface.rateId)
  if (!current) return surface.rateId === head.id
  return substrateGroup(current) === substrateGroup(head)
}

/** Point the surface at the rate for this material. Coats and overrides stay. */
export function applySubstrate(
  surface: SurfaceInput,
  rates: ProductionRate[],
  substrate: Substrate,
): SurfaceInput {
  const current = rates.find((rate) => rate.id === surface.rateId)
  if (!current) return { ...surface, substrate }
  const next = rateForSubstrate(rates, current, substrate)
  return { ...surface, rateId: next.id, substrate }
}

function cloneRate(rate: ProductionRate): ProductionRate {
  return {
    ...rate,
    coatRates: rate.coatRates.map((entry) => ({ ...entry })),
  }
}

/** Add wood, masonry, and metal speeds the company book does not already have. */
export function ensureSubstrateRates(
  rates: ProductionRate[],
  catalog: ProductionRate[] = [],
): ProductionRate[] {
  const byId = new Map<string, ProductionRate>()
  for (const rate of WALL_SUBSTRATE_RATES) byId.set(rate.id, rate)
  for (const rate of catalog) {
    if (rate.substrate && rate.substrate !== "drywall") byId.set(rate.id, rate)
  }
  const ids = new Set(rates.map((rate) => rate.id))
  const missing = [...byId.values()].filter((rate) => !ids.has(rate.id))
  if (missing.length === 0) return rates
  return [...rates, ...missing.map(cloneRate)]
}

/** Speeds for the quote. A company-edited substrate rate wins over the built-in one. */
export function quoteRates(
  draftRates: ProductionRate[],
  companyRates: ProductionRate[],
  areas: AreaInput[],
): ProductionRate[] {
  const catalog = ensureSubstrateRates(companyRates)
  return withCurrentRates(ensureSubstrateRates(draftRates, catalog), catalog, areas)
}
