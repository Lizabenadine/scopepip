import { applyOutbound } from "../messages/thread.ts"
import type { ScopeState } from "../data/seed.ts"
import type { FollowUpMessage } from "./types.ts"

/** Remember a drip note on the estimate, and a text on the client thread. */
export function recordDrip(state: ScopeState, message: FollowUpMessage, now = message.sentAt): ScopeState {
  let next: ScopeState = {
    ...state,
    estimates: state.estimates.map((estimate) => {
      if (estimate.id !== message.estimateId) return estimate
      const prior = estimate.followUpLog ?? []
      const advance = message.delivery === "sent" || message.delivery === "logged"
      const duplicate =
        !advance && prior.some((item) => item.stepId === message.stepId && item.delivery === message.delivery)
      const followUpLog = duplicate ? prior : [...prior, message].slice(-40)
      const enrollment = estimate.followUp
      const stillActive = enrollment?.status === "active" && enrollment.stage === message.stage
      const followUp =
        advance && stillActive && enrollment
          ? {
              ...enrollment,
              sentStepIds: enrollment.sentStepIds.includes(message.stepId)
                ? enrollment.sentStepIds
                : [...enrollment.sentStepIds, message.stepId],
              holdUntil: null,
            }
          : enrollment
      return { ...estimate, followUp, followUpLog, updatedAt: now }
    }),
  }
  if (message.channel === "text" && (message.delivery === "sent" || message.delivery === "logged")) {
    const estimate = next.estimates.find((item) => item.id === message.estimateId)
    if (estimate) {
      next = applyOutbound(next, estimate.clientId, {
        id: message.id,
        direction: "out",
        body: message.body,
        mediaUrls: [],
        createdAt: message.sentAt || now,
        estimateId: message.estimateId,
        delivery: message.delivery === "sent" ? "sent" : "logged",
      })
    }
  }
  return next
}

export function holdDrip(state: ScopeState, estimateId: string, minutes: number, nowMs: number): ScopeState {
  const estimate = state.estimates.find((item) => item.id === estimateId)
  if (!estimate?.followUp || estimate.followUp.status !== "active") return state
  const span = Number.isFinite(minutes) && minutes > 0 ? minutes : 15
  const holdUntil = new Date(nowMs + span * 60 * 1000).toISOString()
  return {
    ...state,
    estimates: state.estimates.map((item) =>
      item.id === estimateId && item.followUp ? { ...item, followUp: { ...item.followUp, holdUntil } } : item,
    ),
  }
}
