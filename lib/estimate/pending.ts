import { roundMoney } from "./calculate.ts"
import type { ChangeOrder, Estimate, EstimateSettings, JobCredit, LineItemInput } from "../types.ts"

const MAX_SIGNATURE = 1_500_000
const MAX_AMOUNT = 1_000_000

/** Signed dollars for work held off the invoice. Negative is a credit. */
export function pendingAmount(line: LineItemInput, settings: EstimateSettings): number {
  const hourlyRate = Number.isFinite(settings.hourlyRate) ? Math.max(0, settings.hourlyRate) : 0
  let labor = 0
  if (line.mode === "hourly") {
    labor = Math.max(0, line.hours) * hourlyRate
  } else if (line.mode === "quantity") {
    const units = Number.isFinite(line.units) ? Math.max(0, line.units) : 0
    const price = Number.isFinite(line.pricePerUnit) ? line.pricePerUnit : 0
    labor = units * price
  } else {
    labor = Number.isFinite(line.customPrice) ? line.customPrice : 0
  }
  const materials = (line.materials ?? []).reduce((sum, row) => {
    const quantity = Number.isFinite(row.quantity) ? Math.max(0, row.quantity) : 0
    const unitPrice = Number.isFinite(row.unitPrice) ? Math.max(0, row.unitPrice) : 0
    return sum + quantity * unitPrice
  }, 0)
  const amount = labor + materials
  if (amount >= 0) return roundMoney(amount, settings.priceRounding)
  return signedCents(amount)
}

export interface SignPendingInput {
  lineIds: string[]
  clientSignatureUrl: string
  now?: Date
}

export type SignedPending =
  | { ok: true; estimate: Estimate; changeOrder: ChangeOrder | null; credits: JobCredit[] }
  | { ok: false; reason: string }

export function signPendingWork(estimate: Estimate, input: SignPendingInput): SignedPending {
  if (estimate.clientStatus !== "accepted" && !estimate.acceptedAt) {
    return { ok: false, reason: "Accept the job before pending work can be signed." }
  }
  const ids = [...new Set(input.lineIds.map((id) => id.trim()).filter(Boolean))]
  if (ids.length === 0 || ids.length > 40) return { ok: false, reason: "Choose the pending work to sign." }
  const signature = input.clientSignatureUrl.trim()
  if (!isSignature(signature)) return { ok: false, reason: "The customer signature is missing." }

  const chosen = ids.map((id) => estimate.lineItems.find((line) => line.id === id) ?? null)
  if (chosen.some((line) => !line?.pending)) return { ok: false, reason: "That work is not pending." }
  const priced = chosen.flatMap((line) => {
    if (!line) return []
    return [{ line, amount: pendingAmount(line, estimate.settings) }]
  })
  if (priced.some((row) => row.amount === 0 || Math.abs(row.amount) > MAX_AMOUNT)) {
    return { ok: false, reason: "Add an amount before the customer signs." }
  }

  const now = (input.now ?? new Date()).toISOString()
  const added = priced.filter((row) => row.amount > 0)
  const reduced = priced.filter((row) => row.amount < 0)
  const signedIds = new Set(priced.map((row) => row.line.id))
  const lineItems = estimate.lineItems.flatMap((line) => {
    if (!signedIds.has(line.id)) return [line]
    const row = priced.find((item) => item.line.id === line.id)
    if (!row || row.amount < 0) return []
    return [{ ...line, pending: false, optional: false, selected: true }]
  })

  const credits: JobCredit[] = reduced.map((row) => ({
    id: `credit_${crypto.randomUUID()}`,
    label: row.line.label.trim() || "Credit",
    amount: signedCents(Math.abs(row.amount)),
    clientSignatureUrl: signature,
    createdAt: now,
  }))
  const changeOrder: ChangeOrder | null =
    added.length > 0
      ? {
          id: `co_${crypto.randomUUID()}`,
          estimateId: estimate.id,
          items: added.map((row) => ({
            id: row.line.id,
            label: row.line.label.trim() || "Additional work",
            amount: signedCents(row.amount),
          })),
          subtotal: signedCents(added.reduce((sum, row) => sum + row.amount, 0)),
          clientSignatureUrl: signature,
          createdAt: now,
        }
      : null

  return {
    ok: true,
    changeOrder,
    credits,
    estimate: {
      ...estimate,
      lineItems,
      changeOrders: changeOrder ? [...(estimate.changeOrders ?? []), changeOrder] : estimate.changeOrders,
      credits: credits.length > 0 ? [...(estimate.credits ?? []), ...credits] : estimate.credits,
      updatedAt: now,
    },
  }
}

function isSignature(value: string): boolean {
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

function signedCents(value: number): number {
  return Math.round(value * 100) / 100
}
