import { gunzipSync } from "node:zlib"
import type { Client, Estimate, WorkOrder } from "../types.ts"
import type { ScopeState } from "./seed.ts"

export interface SingleEstimatePatch {
  estimate: Estimate
  client?: Client
  workOrder?: WorkOrder
}

/**
 * Decodes either standard JSON or a gzip-compressed request body flagged with
 * `x-scopepipe-encoding: gzip` so large account books stay under serverless request limits.
 */
export async function parseBookPayload(request: Request): Promise<unknown> {
  const encoding = request.headers.get("x-scopepipe-encoding")?.toLowerCase()
  const buffer = Buffer.from(await request.arrayBuffer())
  if (buffer.byteLength === 0) return null
  const text = encoding === "gzip" ? gunzipSync(buffer).toString("utf8") : buffer.toString("utf8")
  return JSON.parse(text) as unknown
}

export function isSingleEstimatePayload(value: unknown): value is Estimate {
  if (!value || typeof value !== "object") return false
  const candidate = value as Partial<Estimate>
  return (
    typeof candidate.id === "string" &&
    candidate.id.length > 0 &&
    typeof candidate.clientId === "string" &&
    candidate.clientId.length > 0 &&
    Array.isArray(candidate.areas) &&
    Array.isArray(candidate.lineItems) &&
    typeof candidate.settings === "object" &&
    candidate.settings !== null
  )
}

function sameJson(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b)
}

function changedItemsById<T>(
  previous: T[],
  next: T[],
  keyOf: (item: T) => string,
): { changed: T[]; removed: boolean } {
  const prevMap = new Map(previous.map((item) => [keyOf(item), item]))
  const nextKeys = new Set(next.map(keyOf))
  for (const prevKey of prevMap.keys()) {
    if (!nextKeys.has(prevKey)) return { changed: [], removed: true }
  }
  const changed: T[] = []
  for (const item of next) {
    const prior = prevMap.get(keyOf(item))
    if (!prior || !sameJson(prior, item)) changed.push(item)
  }
  return { changed, removed: false }
}

/**
 * Detects when only one estimate (and optionally its client and work order) changed
 * between `previous` and `next`, so the client can patch only that record cleanly.
 */
export function singleChangedEstimate(
  previous: ScopeState | null,
  next: ScopeState,
): SingleEstimatePatch | null {
  if (!previous) return null
  if (
    previous.version !== next.version ||
    !sameJson(previous.stages, next.stages) ||
    !sameJson(previous.crews, next.crews) ||
    !sameJson(previous.productionRates, next.productionRates) ||
    !sameJson(previous.estimateSettings, next.estimateSettings) ||
    !sameJson(previous.paymentMethods, next.paymentMethods) ||
    !sameJson(previous.customColumns, next.customColumns) ||
    !sameJson(previous.columnLabels, next.columnLabels) ||
    !sameJson(previous.savedTemplates, next.savedTemplates) ||
    !sameJson(previous.areaNames, next.areaNames) ||
    !sameJson(previous.learnedPaces, next.learnedPaces) ||
    !sameJson(previous.followUpSequences, next.followUpSequences) ||
    !sameJson(previous.unmatchedTexts, next.unmatchedTexts) ||
    !sameJson(previous.zapierDelivered, next.zapierDelivered)
  ) {
    return null
  }

  const estDiff = changedItemsById(previous.estimates, next.estimates, (item) => item.id)
  if (estDiff.removed || estDiff.changed.length !== 1) return null
  const estimate = estDiff.changed[0]!

  const clientDiff = changedItemsById(previous.clients, next.clients, (item) => item.id)
  if (clientDiff.removed || clientDiff.changed.length > 1) return null
  const client = clientDiff.changed[0]
  if (client && client.id !== estimate.clientId) return null

  const orderDiff = changedItemsById(previous.workOrders, next.workOrders, (item) => item.estimateId)
  if (orderDiff.removed || orderDiff.changed.length > 1) return null
  const workOrder = orderDiff.changed[0]
  if (workOrder && workOrder.estimateId !== estimate.id) return null

  return {
    estimate,
    ...(client ? { client } : {}),
    ...(workOrder ? { workOrder } : {}),
  }
}

function upsertByKey<T>(items: T[], nextItem: T, keyOf: (item: T) => string, prepend = true): T[] {
  const key = keyOf(nextItem)
  if (items.some((item) => keyOf(item) === key)) {
    return items.map((item) => (keyOf(item) === key ? nextItem : item))
  }
  return prepend ? [nextItem, ...items] : [...items, nextItem]
}

export function applySingleEstimatePatch(state: ScopeState, patch: SingleEstimatePatch): ScopeState {
  const estimates = upsertByKey(state.estimates, patch.estimate, (item) => item.id)
  const clients = patch.client ? upsertByKey(state.clients, patch.client, (item) => item.id) : state.clients
  const workOrders = patch.workOrder
    ? upsertByKey(state.workOrders, patch.workOrder, (item) => item.estimateId)
    : state.workOrders
  return {
    ...state,
    clients,
    estimates,
    workOrders,
  }
}
