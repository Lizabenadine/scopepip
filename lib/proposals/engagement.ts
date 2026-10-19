export const ENGAGEMENT_EVENTS = ["open", "view_section", "revisit"] as const

export type EngagementEventType = (typeof ENGAGEMENT_EVENTS)[number]

export interface ProposalEngagementEvent {
  proposalId: string
  eventType: EngagementEventType
  sectionName: string | null
  timestamp: string
  userAgent: string
}

export function proposalEngagementEvent(input: {
  proposalId: string
  eventType?: unknown
  sectionName?: unknown
  timestamp: string
  userAgent: string
}): { ok: true; event: ProposalEngagementEvent } | { ok: false; error: string } {
  const proposalId = input.proposalId.trim()
  if (!proposalId || proposalId.length > 200) return { ok: false, error: "This proposal link is not valid." }

  const eventType = input.eventType === undefined || input.eventType === null || input.eventType === "" ? "open" : input.eventType
  if (!isEventType(eventType)) return { ok: false, error: "That proposal event is not tracked." }

  let sectionName: string | null = null
  if (typeof input.sectionName === "string" && input.sectionName.trim()) {
    sectionName = input.sectionName.trim().slice(0, 80)
  }

  return {
    ok: true,
    event: {
      proposalId,
      eventType,
      sectionName,
      timestamp: input.timestamp,
      userAgent: input.userAgent.trim() || "unknown",
    },
  }
}

export function engagementTimestamp(value: unknown, now: string): string {
  if (typeof value !== "string" || !value.trim()) return now
  const parsed = Date.parse(value)
  if (!Number.isFinite(parsed)) return now
  return new Date(parsed).toISOString()
}

function isEventType(value: unknown): value is EngagementEventType {
  return typeof value === "string" && (ENGAGEMENT_EVENTS as readonly string[]).includes(value)
}
