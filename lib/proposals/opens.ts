import type { ScopeState } from "../data/seed.ts"
import type { ProposalEngagementEvent } from "../proposals/engagement.ts"
import type { Estimate, ProposalOpen } from "../types.ts"

export function applyProposalEvent(state: ScopeState, event: ProposalEngagementEvent): ScopeState {
  if (event.eventType !== "open" && event.eventType !== "revisit") return state
  const estimate = state.estimates.find((item) => item.publicToken === event.proposalId || item.id === event.proposalId)
  if (!estimate) return state
  const id = proposalEventId(event)
  if ((estimate.proposalOpens ?? []).some((item) => item.id === id)) return state
  const opened: ProposalOpen = { id, at: event.timestamp, kind: event.eventType }
  return {
    ...state,
    estimates: state.estimates.map((item) =>
      item.id === estimate.id ? { ...item, proposalOpens: [...(item.proposalOpens ?? []), opened].slice(-40) } : item,
    ),
  }
}

export function proposalEventId(event: Pick<ProposalEngagementEvent, "proposalId" | "eventType" | "timestamp" | "sectionName">): string {
  return `${event.proposalId}|${event.eventType}|${event.timestamp}|${event.sectionName ?? ""}`.slice(0, 180)
}

export function latestProposalOpen(estimate: Estimate): ProposalOpen | null {
  const opens = estimate.proposalOpens ?? []
  return opens[opens.length - 1] ?? null
}
