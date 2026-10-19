import { calculateEstimate, type EstimateQuote } from "../estimate/calculate.ts"
import { depositAmount, clampDepositPercent } from "../payments/deposit.ts"
import type { Estimate, LineItemInput, PaymentMethod } from "../types.ts"

export function linesWithSelection(lines: LineItemInput[], selectedIds: string[]): LineItemInput[] {
  const selected = new Set(selectedIds)
  return lines.map((item) => (item.optional ? { ...item, selected: selected.has(item.id) } : item))
}

export function proposalFigures(
  estimate: Estimate,
  paymentMethods: PaymentMethod[],
  selectedIds: string[],
): { quote: EstimateQuote; deposit: number; depositPercent: number } {
  const quote = calculateEstimate({
    areas: estimate.areas,
    lineItems: linesWithSelection(estimate.lineItems, selectedIds),
    rates: estimate.rates,
    settings: estimate.settings,
    paymentMethods,
  })
  const depositPercent = clampDepositPercent(estimate.settings.depositPercent)
  return {
    quote,
    deposit: depositAmount(quote.total, depositPercent),
    depositPercent,
  }
}
