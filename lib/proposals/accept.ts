import type { ScopeState } from "../data/seed.ts"
import type { ClientSignature, Estimate } from "../types.ts"
import { createWorkOrder } from "../work-orders/defaults.ts"

export interface AcceptanceInput {
  signedName: string
  signaturePayload: string
  signedAt: string
  selectedLineIds: string[]
}

export type AcceptanceResult =
  | { ok: true; state: ScopeState; estimateId: string }
  | { ok: false; reason: string }

export function applyAcceptance(
  state: ScopeState,
  token: string,
  input: AcceptanceInput,
): AcceptanceResult {
  const estimate = state.estimates.find((item) => item.publicToken === token)
  if (!estimate) return { ok: false, reason: "This proposal link is not valid." }
  if (estimate.clientStatus === "declined" || estimate.declinedAt) {
    return { ok: false, reason: "This proposal was declined." }
  }
  if (estimate.clientStatus === "accepted" || estimate.signature) {
    return { ok: false, reason: "This proposal is already accepted." }
  }
  const signedName = input.signedName.trim()
  if (!signedName) return { ok: false, reason: "Sign with your name." }
  if (!input.signaturePayload) return { ok: false, reason: "Add a signature." }

  const selected = new Set(input.selectedLineIds)
  const signature: ClientSignature = {
    signedName,
    signaturePayload: input.signaturePayload,
    signedAt: input.signedAt,
    selectedLineIds: input.selectedLineIds,
  }
  const updated: Estimate = {
    ...estimate,
    clientStatus: "accepted",
    acceptedAt: input.signedAt,
    declinedAt: null,
    signature,
    updatedAt: input.signedAt,
    lineItems: estimate.lineItems.map((item) =>
      item.optional ? { ...item, selected: selected.has(item.id) } : item,
    ),
  }
  const estimates = state.estimates.map((item) => (item.id === updated.id ? updated : item))
  const workOrders = state.workOrders.some((order) => order.estimateId === updated.id)
    ? state.workOrders
    : [createWorkOrder(updated), ...state.workOrders]
  return { ok: true, estimateId: updated.id, state: { ...state, estimates, workOrders } }
}
