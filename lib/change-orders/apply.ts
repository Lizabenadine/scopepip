import type { ScopeState } from "../data/seed.ts"
import type { ChangeOrder, Estimate } from "../types.ts"
import type { LineItemInput } from "../types.ts"

export type ApplyChangeOrderResult =
  | { ok: true; state: ScopeState; estimate: Estimate }
  | { ok: false; reason: string }

export function applyChangeOrder(
  state: ScopeState,
  changeOrder: ChangeOrder,
  lineItems: LineItemInput[],
): ApplyChangeOrderResult {
  const estimate = state.estimates.find((item) => item.id === changeOrder.estimateId)
  if (!estimate) return { ok: false, reason: "This work order is not on file." }
  const updated: Estimate = {
    ...estimate,
    lineItems: [...estimate.lineItems, ...lineItems],
    changeOrders: [...(estimate.changeOrders ?? []), changeOrder],
    updatedAt: changeOrder.createdAt,
  }
  return {
    ok: true,
    estimate: updated,
    state: {
      ...state,
      estimates: state.estimates.map((item) => (item.id === updated.id ? updated : item)),
    },
  }
}
