import { calculateEstimate, type EstimateQuote } from "../estimate/calculate.ts"
import { ensureSubstrateRates } from "../estimate/substrate.ts"
import { withApprovedScope } from "../estimate/versions.ts"
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
  const source = withApprovedScope(estimate)
  const quote = calculateEstimate({
    areas: source.areas,
    lineItems: linesWithSelection(source.lineItems, selectedIds),
    rates: ensureSubstrateRates(source.rates),
    settings: source.settings,
    paymentMethods,
  })
  const depositPercent = clampDepositPercent(estimate.settings.depositPercent)
  return {
    quote,
    deposit: depositAmount(quote.total, depositPercent),
    depositPercent,
  }
}
