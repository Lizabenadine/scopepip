import type { ChangeOrder, ChangeOrderItem, LineItemInput } from "../types.ts"

const MAX_ITEMS = 40
const MAX_AMOUNT = 1_000_000
const MAX_SIGNATURE = 1_500_000

export interface ChangeOrderRequest {
  items: unknown
  subtotal: unknown
  clientSignatureUrl: unknown
}

export type ReceivedChangeOrder =
  | { ok: true; changeOrder: ChangeOrder; lineItems: LineItemInput[] }
  | { ok: false; error: string }

export function receiveChangeOrder(
  workOrderId: string,
  body: ChangeOrderRequest,
  now = new Date(),
): ReceivedChangeOrder {
  const id = workOrderId.trim()
  if (!id) return { ok: false, error: "Missing required change order details or signature." }
  if (!Array.isArray(body.items) || body.items.length === 0 || body.items.length > MAX_ITEMS) {
    return { ok: false, error: "Missing required change order details or signature." }
  }

  const signature = typeof body.clientSignatureUrl === "string" ? body.clientSignatureUrl.trim() : ""
  if (!isSignatureUrl(signature)) {
    return { ok: false, error: "Missing required change order details or signature." }
  }

  const items: ChangeOrderItem[] = []
  for (const entry of body.items) {
    const item = readItem(entry)
    if (!item) return { ok: false, error: "Missing required change order details or signature." }
    items.push(item)
  }

  const subtotal = cents(items.reduce((sum, item) => sum + item.amount, 0))
  if (subtotal <= 0) return { ok: false, error: "Missing required change order details or signature." }
  if (body.subtotal !== undefined && body.subtotal !== null && !sameMoney(body.subtotal, subtotal)) {
    return { ok: false, error: "The change order subtotal does not match its items." }
  }

  const createdAt = now.toISOString()
  const changeOrder: ChangeOrder = {
    id: `co_${crypto.randomUUID()}`,
    estimateId: id,
    items,
    subtotal,
    clientSignatureUrl: signature,
    createdAt,
  }
  return { ok: true, changeOrder, lineItems: items.map(lineForItem) }
}

function readItem(entry: unknown): ChangeOrderItem | null {
  if (!entry || typeof entry !== "object") return null
  const record = entry as Record<string, unknown>
  const labelSource = record.label ?? record.description
  const label = typeof labelSource === "string" ? labelSource.trim() : ""
  if (!label) return null
  const amount = itemAmount(record)
  if (amount === null || amount > MAX_AMOUNT) return null
  return { id: crypto.randomUUID(), label, amount }
}

function itemAmount(record: Record<string, unknown>): number | null {
  if (record.amount !== undefined && record.amount !== null) {
    const amount = finiteNumber(record.amount)
    if (amount === null || amount < 0) return null
    return cents(amount)
  }
  const quantity = finiteNumber(record.quantity)
  const unitPrice = finiteNumber(record.unitPrice)
  if (quantity === null || unitPrice === null || quantity < 0 || unitPrice < 0) return null
  return cents(quantity * unitPrice)
}

function lineForItem(item: ChangeOrderItem): LineItemInput {
  return {
    id: item.id,
    label: item.label,
    clientNote: "Added by signed change order.",
    crewNote: "",
    mode: "custom",
    hours: 0,
    units: 0,
    pricePerUnit: 0,
    customPrice: item.amount,
    workOrderHours: 0,
    hiddenOnWorkOrder: false,
    materials: [],
  }
}

function isSignatureUrl(value: string): boolean {
  if (!value || value.length > MAX_SIGNATURE) return false
  if (value.startsWith("data:image/png") || value.startsWith("data:image/jpeg") || value.startsWith("data:image/webp")) {
    return true
  }
  try {
    const url = new URL(value)
    return url.protocol === "https:" || url.protocol === "http:"
  } catch {
    return false
  }
}

function finiteNumber(value: unknown): number | null {
  const number = typeof value === "number" ? value : typeof value === "string" && value.trim() ? Number(value) : NaN
  if (!Number.isFinite(number)) return null
  return number
}

function cents(value: number): number {
  return Math.round(value * 100) / 100
}

function sameMoney(value: unknown, expected: number): boolean {
  const number = finiteNumber(value)
  if (number === null) return false
  return Math.abs(cents(number) - expected) < 0.001
}
