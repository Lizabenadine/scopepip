import type { ScopeState } from "../data/seed.ts"
import type { DepositReceipt, Estimate } from "../types.ts"
import { createWorkOrder } from "../work-orders/defaults.ts"

export type DepositResult =
  | { ok: true; state: ScopeState }
  | { ok: false; reason: string }

export function applyDeposit(
  state: ScopeState,
  estimateId: string,
  receipt: DepositReceipt,
): DepositResult {
  const estimate = state.estimates.find((item) => item.id === estimateId)
  if (!estimate) return { ok: false, reason: "This estimate is not on file." }
  if (estimate.clientStatus !== "accepted") {
    return { ok: false, reason: "Accept the proposal before paying the deposit." }
  }
  if (estimate.depositReceipt) {
    if (estimate.depositReceipt.paymentIntentId === receipt.paymentIntentId) return { ok: true, state }
    return { ok: false, reason: "A deposit is already recorded." }
  }

  const updated: Estimate = {
    ...estimate,
    paymentStatus: "deposit_paid",
    depositReceipt: receipt,
    updatedAt: receipt.paidAt,
  }
  const estimates = state.estimates.map((item) => (item.id === updated.id ? updated : item))
  const existing = state.workOrders.find((order) => order.estimateId === updated.id)
  const workOrders = existing ? state.workOrders : [createWorkOrder(updated), ...state.workOrders]
  return { ok: true, state: { ...state, estimates, workOrders } }
}
