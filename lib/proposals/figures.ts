import { calculateEstimateTotals, type EstimateQuote } from "../estimate/calculate.ts"
import { ensureSubstrateRates } from "../estimate/substrate.ts"
import { withApprovedScope } from "../estimate/versions.ts"
import { clampDepositPercent } from "../payments/deposit.ts"
import type { Estimate, LineItemInput, PaymentMethod } from "../types.ts"

export function linesWithSelection(lines: LineItemInput[], selectedIds: string[]): LineItemInput[] {
  const selected = new Set(selectedIds)
  return lines.map((item) => (item.optional ? { ...item, selected: selected.has(item.id) } : item))
}

export function proposalFigures(
  estimate: Estimate,
  paymentMethods: PaymentMethod[],
  selectedIds: string[],
): { quote: EstimateQuote; deposit: number; balance: number; depositPercent: number } {
  const source = withApprovedScope(estimate)
  const totals = calculateEstimateTotals({
    areas: source.areas,
    lineItems: linesWithSelection(source.lineItems, selectedIds),
    rates: ensureSubstrateRates(source.rates),
    settings: source.settings,
    paymentMethods,
  })
  return {
    quote: totals.quote,
    deposit: totals.deposit,
    balance: totals.balance,
    depositPercent: clampDepositPercent(estimate.settings.depositPercent),
  }
}
