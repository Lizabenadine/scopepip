import type { ScopeState } from "../data/seed.ts"
import { workOrderForStage } from "../dispatch/assign.ts"
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

  const current = state.stages.find((stage) => stage.id === estimate.stageId)
  const scheduled = state.stages.find((stage) => stage.slug === "scheduled")
  const updated: Estimate = {
    ...estimate,
    paymentStatus: "deposit_paid",
    depositReceipt: receipt,
    stageId: current?.slug === "completed" ? estimate.stageId : (scheduled?.id ?? estimate.stageId),
    scheduledOn: estimate.scheduledOn ?? receipt.paidAt.slice(0, 10),
    updatedAt: receipt.paidAt,
  }
  const estimates = state.estimates.map((item) => (item.id === updated.id ? updated : item))
  const existing = state.workOrders.find((order) => order.estimateId === updated.id)
  const opened = existing ?? createWorkOrder(updated)
  const scheduledOrder =
    current?.slug === "completed"
      ? opened
      : workOrderForStage(opened, "scheduled", updated.scheduledOn)
  const workOrders = existing
    ? state.workOrders.map((order) => (order.estimateId === updated.id ? scheduledOrder : order))
    : [scheduledOrder, ...state.workOrders]
  return { ok: true, state: { ...state, estimates, workOrders } }
}
