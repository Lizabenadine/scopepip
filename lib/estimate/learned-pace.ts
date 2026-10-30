import type { AreaInput, AreaType, ProductionRate, SurfaceInput } from "../types.ts"

export interface LearnedSpeed {
  rateId: string
  coats: number
  value: number
}

/** Hours a finished room actually took, and the finish speeds that pace implies. */
export interface LearnedPace {
  id: string
  estimateId: string
  areaId: string
  areaName: string
  areaType: AreaType
  lengthFt: number
  widthFt: number
  heightFt: number
  estimatedHours: number
  actualHours: number
  speeds: LearnedSpeed[]
}

const TIMED = new Set<ProductionRate["basis"]>(["sqft_per_hour", "lnft_per_hour", "hours_per_item"])

function coatCountOf(surface: SurfaceInput): number {
  const coats = surface.finishCoats ?? surface.coatCount
  if (!Number.isFinite(coats) || coats <= 0) return 0
  return Math.min(6, Math.round(coats))
}

function sizeToken(area: {
  areaType: string
  lengthFt: number
  widthFt: number
  heightFt: number
}): string {
  const size = (value: number) => Math.round(value * 100) / 100
  return `${area.areaType}:${size(area.lengthFt)}x${size(area.widthFt)}x${size(area.heightFt)}`
}

function withoutPace(surface: SurfaceInput): SurfaceInput {
  if (surface.paceSpeed == null && surface.paceCoats == null) return surface
  const next = { ...surface }
  delete next.paceSpeed
  delete next.paceCoats
  return next
}

export function learnRoomPace(input: {
  estimateId: string
  area: AreaInput
  rates: ProductionRate[]
  estimatedHours: number
  surfaceHours: { id: string; allocatedHours: number }[]
  actualHours: number
}): { ok: true; pace: LearnedPace } | { ok: false; reason: string } {
  if (!Number.isFinite(input.actualHours) || input.actualHours <= 0) {
    return { ok: false, reason: "Enter the hours this room took." }
  }
  if (!Number.isFinite(input.estimatedHours) || input.estimatedHours <= 0) {
    return { ok: false, reason: "This room has no estimated hours to compare." }
  }
  // A slower room lowers sq ft per hour and raises hours per item. Primer speed stays on the rate card.
  const slower = input.actualHours / input.estimatedHours
  const faster = input.estimatedHours / input.actualHours
  const hoursById = new Map(input.surfaceHours.map((surface) => [surface.id, surface.allocatedHours]))
  const speeds: LearnedSpeed[] = []
  for (const surface of input.area.surfaces) {
    const spent = hoursById.get(surface.id) ?? 0
    if (!(spent > 0)) continue
    const rate = input.rates.find((item) => item.id === surface.rateId)
    if (!rate || !TIMED.has(rate.basis)) continue
    const coats = coatCountOf(surface)
    const box = rate.coatRates.find((entry) => entry.coats === coats)
    if (!box || !(box.value > 0)) continue
    const raw = rate.basis === "hours_per_item" ? box.value * slower : box.value * faster
    const value = Math.round(raw * 1000) / 1000
    if (!(value > 0)) continue
    const speed = { rateId: rate.id, coats, value }
    const existing = speeds.findIndex((item) => item.rateId === speed.rateId && item.coats === speed.coats)
    if (existing >= 0) speeds[existing] = speed
    else speeds.push(speed)
  }
  if (speeds.length === 0) {
    return { ok: false, reason: "This room has no timed surfaces to learn from." }
  }
  return {
    ok: true,
    pace: {
      id: `${input.estimateId}:${input.area.id}`,
      estimateId: input.estimateId,
      areaId: input.area.id,
      areaName: input.area.name,
      areaType: input.area.areaType,
      lengthFt: input.area.lengthFt,
      widthFt: input.area.widthFt,
      heightFt: input.area.heightFt,
      estimatedHours: input.estimatedHours,
      actualHours: input.actualHours,
      speeds,
    },
  }
}

function newestPace(area: AreaInput, paces: LearnedPace[], estimateId: string | null): LearnedPace | null {
  const token = sizeToken(area)
  let match: LearnedPace | null = null
  for (const pace of paces) {
    if (estimateId && pace.estimateId === estimateId) continue
    if (sizeToken(pace) !== token) continue
    match = pace
  }
  return match
}

/**
 * Stamp finish speeds onto rooms of a learned size.
 * Locked rooms keep a speed they were already priced with.
 * The estimate that taught a pace does not receive it.
 */
export function applyLearnedPaces(
  areas: AreaInput[],
  paces: LearnedPace[] | undefined,
  estimateId: string | null,
  lockedAreaIds: ReadonlySet<string> = new Set(),
): AreaInput[] {
  const list = paces ?? []
  let changed = false
  const next = areas.map((area) => {
    const pace = newestPace(area, list, estimateId)
    const locked = lockedAreaIds.has(area.id)
    const surfaces = area.surfaces.map((surface) => {
      const coats = coatCountOf(surface)
      const speed = pace?.speeds.find((item) => item.rateId === surface.rateId && item.coats === coats)
      const saved =
        surface.paceSpeed != null && surface.paceSpeed > 0 && surface.paceCoats === coats && pace != null
      if (locked && saved) return surface
      if (!speed || locked) {
        const cleared = withoutPace(surface)
        if (cleared !== surface) changed = true
        return cleared
      }
      if (surface.paceSpeed === speed.value && surface.paceCoats === speed.coats) return surface
      changed = true
      return { ...surface, paceSpeed: speed.value, paceCoats: speed.coats }
    })
    if (surfaces.every((surface, index) => surface === area.surfaces[index])) return area
    return { ...area, surfaces }
  })
  return changed ? next : areas
}

/** Use a learned finish speed when this surface was priced from a room of the same size. */
export function rateAtPace(rate: ProductionRate, surface: SurfaceInput, coats: number): ProductionRate {
  if (surface.paceCoats !== coats) return rate
  const speed = surface.paceSpeed
  if (speed == null || !Number.isFinite(speed) || speed <= 0) return rate
  if (!TIMED.has(rate.basis)) return rate
  const exists = rate.coatRates.some((entry) => entry.coats === coats)
  const coatRates = exists
    ? rate.coatRates.map((entry) => (entry.coats === coats ? { ...entry, value: speed } : entry))
    : [...rate.coatRates, { coats, value: speed }]
  return { ...rate, coatRates }
}
