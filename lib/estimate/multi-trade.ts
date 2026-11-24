import { calculateEstimate, type EstimateQuote } from "./calculate.ts"
import { ensureSubstrateRates } from "./substrate.ts"
import { calculateFlooringQuote } from "../flooring/calculate.ts"
import { calculateDrywallQuote } from "../drywall/calculate.ts"
import type {
  Estimate,
  EstimateDraft,
  FlooringScope,
  DrywallScope,
  PaymentMethod,
} from "../types.ts"
import type {
  MultiTradeQuote,
  TradeSummary,
  TradeType,
} from "./multi-trade-types.ts"
import { moneyExact } from "../format.ts"

/**
 * Determines the active trades for an estimate.
 * Guaranteed backward-compatible: estimates with no trades property default to ["painting"].
 */
export function activeTrades(estimate: Estimate | EstimateDraft | Partial<Estimate>): TradeType[] {
  if (Array.isArray(estimate.trades) && estimate.trades.length > 0) {
    return estimate.trades
  }
  if (estimate.primaryTrade) {
    return [estimate.primaryTrade]
  }
  const set = new Set<TradeType>()
  if (
    estimate.flooringScope &&
    Array.isArray(estimate.flooringScope.rooms) &&
    estimate.flooringScope.rooms.length > 0
  ) {
    set.add("flooring")
  }
  if (
    estimate.drywallScope &&
    Array.isArray(estimate.drywallScope.rooms) &&
    estimate.drywallScope.rooms.length > 0
  ) {
    set.add("drywall")
  }
  if (
    (Array.isArray(estimate.areas) && estimate.areas.some((a) => (a.surfaces?.length ?? 0) > 0)) ||
    (Array.isArray(estimate.lineItems) && estimate.lineItems.length > 0)
  ) {
    set.add("painting")
  }
  if (set.size > 0) {
    return Array.from(set)
  }
  return ["painting"]
}

export function isMultiTrade(estimate: Estimate | EstimateDraft | Partial<Estimate>): boolean {
  return activeTrades(estimate).length > 1
}

/**
 * Computes a unified multi-trade quote for an estimate combining Painting, Flooring, and Drywall.
 */
export function calculateMultiTradeQuote(
  estimate: Estimate | EstimateDraft,
  paymentMethods: PaymentMethod[] = [],
  customerLineIds?: string[]
): {
  multiTradeQuote: MultiTradeQuote
  paintingQuote?: EstimateQuote
} {
  const trades = activeTrades(estimate)
  const summaries: TradeSummary[] = []
  const combinedBuyList: MultiTradeQuote["combinedBuyList"] = []

  let paintingTotal = 0
  let flooringTotal = 0
  let drywallTotal = 0
  let combinedSubtotal = 0
  let combinedOverhead = 0
  let combinedProfit = 0
  let paintingQuoteResult: EstimateQuote | undefined

  // 1. Painting Scope
  if (trades.includes("painting")) {
    const rawLines = estimate.lineItems || []
    const selectedSet = customerLineIds ? new Set(customerLineIds) : null
    const lineItems = selectedSet
      ? rawLines.map((item) => (item.optional ? { ...item, selected: selectedSet.has(item.id) } : item))
      : rawLines

    const pQuote = calculateEstimate({
      areas: estimate.areas || [],
      lineItems,
      rates: ensureSubstrateRates(estimate.rates),
      settings: estimate.settings,
      paymentMethods,
    })
    paintingQuoteResult = pQuote
    paintingTotal = pQuote.total
    combinedSubtotal += pQuote.subtotal
    combinedProfit += Math.max(0, pQuote.total - pQuote.subtotal)

    const totalSurfaces = pQuote.areas.reduce((acc, a) => acc + a.surfaces.length, 0)
    summaries.push({
      trade: "painting",
      label: "Painting & Coating",
      netQuantityLabel: `${pQuote.areas.length} rooms / ${totalSurfaces} surfaces`,
      materialCost: pQuote.materialCost,
      laborCost: pQuote.laborPrice,
      subtotal: pQuote.subtotal,
      total: pQuote.total,
    })
  }

  // 2. Flooring Scope
  if (trades.includes("flooring") && estimate.flooringScope) {
    const fQuote = calculateFlooringQuote(estimate.flooringScope)
    flooringTotal = fQuote.total
    combinedSubtotal += fQuote.subtotal
    combinedOverhead += fQuote.overhead
    combinedProfit += fQuote.profit

    summaries.push({
      trade: "flooring",
      label: "Flooring Installation",
      netQuantityLabel: `${fQuote.netSqFt.toLocaleString()} sq ft (${fQuote.totalBoxes} boxes)`,
      materialCost: fQuote.materialCost + fQuote.trimCost + fQuote.transitionsCost,
      laborCost: fQuote.laborCost + fQuote.demoCost + fQuote.prepCost,
      subtotal: fQuote.subtotal,
      total: fQuote.total,
    })

    if (fQuote.buyList.length > 0) {
      combinedBuyList.push({
        trade: "flooring",
        tradeLabel: "Flooring Materials",
        items: fQuote.buyList,
      })
    }
  }

  // 3. Drywall Scope
  if (trades.includes("drywall") && estimate.drywallScope) {
    const dQuote = calculateDrywallQuote(estimate.drywallScope)
    drywallTotal = dQuote.total
    combinedSubtotal += dQuote.subtotal
    combinedOverhead += dQuote.overhead
    combinedProfit += dQuote.profit

    summaries.push({
      trade: "drywall",
      label: "Drywall & Finishing",
      netQuantityLabel: `${dQuote.totalNetSqFt.toLocaleString()} sq ft (${dQuote.totalSheets} sheets)`,
      materialCost:
        dQuote.boardMaterialCost +
        dQuote.jointCompoundCost +
        dQuote.fastenersAndTapeCost +
        dQuote.cornerBeadCost +
        dQuote.insulationCost +
        dQuote.framingCost,
      laborCost: dQuote.hangingLaborCost + dQuote.finishingLaborCost,
      subtotal: dQuote.subtotal,
      total: dQuote.total,
    })

    if (dQuote.buyList.length > 0) {
      combinedBuyList.push({
        trade: "drywall",
        tradeLabel: "Drywall Materials",
        items: dQuote.buyList,
      })
    }
  }

  const combinedTotal = Number((paintingTotal + flooringTotal + drywallTotal).toFixed(2))

  const depositPercent =
    estimate.settings?.depositPercent !== undefined
      ? Math.max(0, Math.min(100, estimate.settings.depositPercent))
      : 30

  const depositAmount = Number(((combinedTotal * depositPercent) / 100).toFixed(2))
  const balanceAmount = Number((combinedTotal - depositAmount).toFixed(2))

  return {
    multiTradeQuote: {
      trades,
      paintingTotal,
      flooringTotal,
      drywallTotal,
      combinedSubtotal: Number(combinedSubtotal.toFixed(2)),
      combinedOverhead: Number(combinedOverhead.toFixed(2)),
      combinedProfit: Number(combinedProfit.toFixed(2)),
      combinedTotal,
      depositAmount,
      balanceAmount,
      tradeSummaries: summaries,
      combinedBuyList,
    },
    paintingQuote: paintingQuoteResult,
  }
}
