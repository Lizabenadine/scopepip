import { calculateEstimate } from "../estimate/calculate.ts"
import type { Estimate, PaymentMethod } from "../types.ts"
import { clampDepositPercent, depositAmount } from "./deposit.ts"

export function depositCharge(
  estimate: Estimate,
  paymentMethods: PaymentMethod[],
): { amount: string; dollars: number; percent: number } | null {
  if (estimate.clientStatus !== "accepted") return null
  const quote = calculateEstimate({
    areas: estimate.areas,
    lineItems: estimate.lineItems,
    rates: estimate.rates,
    settings: estimate.settings,
    paymentMethods,
  })
  const percent = clampDepositPercent(estimate.settings.depositPercent)
  const dollars = depositAmount(quote.total, percent)
  if (dollars <= 0) return null
  return { amount: dollars.toFixed(2), dollars, percent }
}
