import { calculateEstimate, type EstimateQuote } from "../estimate/calculate.ts"
import { ensureSubstrateRates } from "../estimate/substrate.ts"
import { withApprovedScope } from "../estimate/versions.ts"
import { depositAmount, clampDepositPercent } from "../payments/deposit.ts"
import type { Estimate, LineItemInput, PaymentMethod } from "../types.ts"
import { calculateMultiTradeQuote, activeTrades } from "../estimate/multi-trade.ts"
import type { MultiTradeQuote } from "../estimate/multi-trade-types.ts"

export function linesWithSelection(lines: LineItemInput[], selectedIds: string[]): LineItemInput[] {
  const selected = new Set(selectedIds)
  return lines.map((item) => (item.optional ? { ...item, selected: selected.has(item.id) } : item))
}

export function proposalFigures(
  estimate: Estimate,
  paymentMethods: PaymentMethod[],
  selectedIds: string[],
): {
  quote: EstimateQuote
  deposit: number
  depositPercent: number
  multiTradeQuote?: MultiTradeQuote
  total: number
} {
  const source = withApprovedScope(estimate)
  const depositPercent = clampDepositPercent(estimate.settings?.depositPercent)

  const trades = activeTrades(source)
  const hasFlooring = Boolean(
    source.flooringScope &&
      ((Array.isArray(source.flooringScope.rooms) && source.flooringScope.rooms.length > 0) ||
        source.flooringScope.jobType === "refinish")
  )
  const hasDrywall = Boolean(source.drywallScope && source.drywallScope.rooms.length > 0)
  const isMulti =
    hasFlooring ||
    hasDrywall ||
    trades.length > 1 ||
    trades.some((t) => t !== "painting")

  if (isMulti) {
    const { multiTradeQuote, paintingQuote } = calculateMultiTradeQuote(
      source,
      paymentMethods,
      selectedIds
    )
    const baseQuote =
      paintingQuote ??
      calculateEstimate({
        areas: source.areas,
        lineItems: linesWithSelection(source.lineItems, selectedIds),
        rates: ensureSubstrateRates(source.rates),
        settings: source.settings,
        paymentMethods,
      })
    const effectiveTotal = multiTradeQuote.combinedTotal
    const customerSubtotal =
      baseQuote.discount > 0 || baseQuote.tax > 0
        ? effectiveTotal + baseQuote.discount - baseQuote.tax
        : effectiveTotal
    const quote: EstimateQuote = {
      ...baseQuote,
      total: effectiveTotal,
      subtotal: customerSubtotal,
    }
    return {
      quote,
      deposit: depositAmount(effectiveTotal, depositPercent),
      depositPercent,
      multiTradeQuote,
      total: effectiveTotal,
    }
  }

  const quote = calculateEstimate({
    areas: source.areas,
    lineItems: linesWithSelection(source.lineItems, selectedIds),
    rates: ensureSubstrateRates(source.rates),
    settings: source.settings,
    paymentMethods,
  })
  return {
    quote,
    deposit: depositAmount(quote.total, depositPercent),
    depositPercent,
    total: quote.total,
  }
}

