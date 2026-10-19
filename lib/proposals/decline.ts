import type { ScopeState } from "../data/seed.ts"

export type DeclineResult =
  | { ok: true; state: ScopeState; estimateId: string }
  | { ok: false; reason: string }

export function applyDecline(state: ScopeState, token: string, declinedAt: string): DeclineResult {
  const estimate = state.estimates.find((item) => item.publicToken === token)
  if (!estimate) return { ok: false, reason: "This proposal link is not valid." }
  if (estimate.clientStatus === "accepted" || estimate.signature) {
    return { ok: false, reason: "This proposal is already accepted." }
  }
  if (estimate.clientStatus === "declined" || estimate.declinedAt) {
    return { ok: false, reason: "This proposal was already declined." }
  }
  const updated = {
    ...estimate,
    clientStatus: "declined" as const,
    declinedAt,
    updatedAt: declinedAt,
  }
  return {
    ok: true,
    estimateId: updated.id,
    state: {
      ...state,
      estimates: state.estimates.map((item) => (item.id === updated.id ? updated : item)),
    },
  }
}
