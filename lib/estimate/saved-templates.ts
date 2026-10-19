import type { AreaGroup, EstimateKind } from "../types.ts"
import type { AreaInput, LineItemInput, ProductionRate, SurfaceInput } from "../types.ts"

export interface SavedEstimateTemplate {
  id: string
  name: string
  kind: EstimateKind
  title: string
  areas: AreaInput[]
  /** Missing means the saved rooms are ungrouped. */
  areaGroups?: AreaGroup[]
  lineItems: LineItemInput[]
  createdAt: string
}

export function captureEstimateTemplate(input: {
  name: string
  kind: EstimateKind
  title: string
  areas: AreaInput[]
  areaGroups?: AreaGroup[]
  lineItems: LineItemInput[]
  now?: string
}): SavedEstimateTemplate | null {
  const name = input.name.trim()
  if (!name) return null
  if (input.areas.length === 0 && input.lineItems.length === 0) return null
  const { groups, idMap } = cloneGroups(input.areaGroups, false)
  const template: SavedEstimateTemplate = {
    id: crypto.randomUUID(),
    name,
    kind: input.kind,
    title: input.title.trim() || name,
    areas: input.areas.map((area) => assignGroup(cloneArea(area, false), groups, idMap)),
    lineItems: input.lineItems.map((line) => cloneLine(line, false)),
    createdAt: input.now ?? new Date().toISOString(),
  }
  if (groups.length > 0) template.areaGroups = groups
  return template
}

export function applySavedTemplate(template: SavedEstimateTemplate): {
  areas: AreaInput[]
  lineItems: LineItemInput[]
  title: string
  areaGroups: AreaGroup[]
} {
  const { groups, idMap } = cloneGroups(template.areaGroups, true)
  return {
    title: template.title,
    areas: template.areas.map((area) => assignGroup(cloneArea(area, true), groups, idMap)),
    lineItems: template.lineItems.map((line) => cloneLine(line, true)),
    areaGroups: groups,
  }
}

export function savedTemplateSummary(template: SavedEstimateTemplate): string {
  const names = template.areas.map((area) => area.name.trim()).filter(Boolean)
  if (names.length > 0) return names.join(", ")
  const labels = template.lineItems.map((line) => line.label.trim()).filter(Boolean)
  return labels.join(", ") || "Saved scope"
}

/** Swap in the company's current speeds for the rates this scope uses. */
export function withCurrentRates(
  draftRates: ProductionRate[],
  currentRates: ProductionRate[],
  areas: AreaInput[],
): ProductionRate[] {
  const used = new Set(areas.flatMap((area) => area.surfaces.map((surface) => surface.rateId)))
  if (used.size === 0) return draftRates
  const currentById = new Map(currentRates.map((rate) => [rate.id, rate]))
  const next = draftRates.map((rate) => {
    if (!used.has(rate.id)) return rate
    const fresh = currentById.get(rate.id)
    return fresh ? cloneRate(fresh) : rate
  })
  for (const rateId of used) {
    if (next.some((rate) => rate.id === rateId)) continue
    const fresh = currentById.get(rateId)
    if (fresh) next.push(cloneRate(fresh))
  }
  return next
}

function cloneGroups(
  groups: AreaGroup[] | undefined,
  freshIds: boolean,
): { groups: AreaGroup[]; idMap: Map<string, string> } {
  const idMap = new Map<string, string>()
  const next = (groups ?? []).map((group) => {
    const id = freshIds ? crypto.randomUUID() : group.id
    idMap.set(group.id, id)
    return { id, name: group.name }
  })
  return { groups: next, idMap }
}

function assignGroup(area: AreaInput, groups: AreaGroup[], idMap: Map<string, string>): AreaInput {
  if (groups.length === 0) return withoutGroup(area)
  const groupId = area.groupId ? idMap.get(area.groupId) : undefined
  if (!groupId) return withoutGroup(area)
  return { ...area, groupId }
}

function withoutGroup(area: AreaInput): AreaInput {
  if (area.groupId === undefined) return area
  const next = { ...area }
  delete next.groupId
  return next
}

function cloneArea(area: AreaInput, freshIds: boolean): AreaInput {
  return {
    ...area,
    id: freshIds ? crypto.randomUUID() : area.id,
    surfaces: area.surfaces.map((surface) => cloneSurface(surface, freshIds)),
  }
}

function cloneSurface(surface: SurfaceInput, freshIds: boolean): SurfaceInput {
  return { ...surface, id: freshIds ? crypto.randomUUID() : surface.id }
}

function cloneLine(line: LineItemInput, freshIds: boolean): LineItemInput {
  return {
    ...line,
    id: freshIds ? crypto.randomUUID() : line.id,
    materials: (line.materials ?? []).map((material) => ({
      ...material,
      id: freshIds ? crypto.randomUUID() : material.id,
    })),
  }
}

function cloneRate(rate: ProductionRate): ProductionRate {
  return {
    ...rate,
    coatRates: rate.coatRates.map((entry) => ({ ...entry })),
    estimateKinds: rate.estimateKinds ? [...rate.estimateKinds] : undefined,
  }
}
