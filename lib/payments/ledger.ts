import { clampDepositPercent } from "./deposit.ts"
import type { Client, Estimate } from "../types.ts"

export interface PaymentRow {
  id: string
  clientName: string
  title: string
  total: number
  paid: number
  credit: number
  balance: number
  depositPercent: number
}

export function listPaymentRows(
  estimates: Estimate[],
  clients: Client[],
  totalFor: (estimate: Estimate) => number,
): PaymentRow[] {
  const rows: PaymentRow[] = []
  for (const estimate of estimates) {
    const invoiced = estimate.clientStatus === "accepted" || estimate.paymentStatus === "deposit_paid"
    if (!invoiced) continue
    const total = roundCents(totalFor(estimate))
    const paid = roundCents(estimate.depositReceipt?.amount ?? 0)
    const credit = roundCents((estimate.credits ?? []).reduce((sum, item) => sum + item.amount, 0))
    const client = clients.find((item) => item.id === estimate.clientId)
    rows.push({
      id: estimate.id,
      clientName: client?.name ?? "Client",
      title: estimate.title,
      total,
      paid,
      credit,
      balance: Math.max(0, roundCents(total - credit - paid)),
      depositPercent: estimate.depositReceipt?.depositPercent ?? clampDepositPercent(estimate.settings.depositPercent),
    })
  }
  return rows.sort((left, right) => left.clientName.localeCompare(right.clientName))
}

function roundCents(value: number): number {
  return Math.round(value * 100) / 100
}
