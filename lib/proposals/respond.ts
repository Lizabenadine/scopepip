import { engagementTimestamp, proposalEngagementEvent } from "./engagement.ts"
import { addProposalEvent } from "./event-spool.ts"
import { forwardEngagement, storeEngagement } from "./engagement-sync.ts"

export async function proposalEventResponse(request: Request, proposalId: string): Promise<Response> {
  try {
    const body = await request.json().catch(() => null)
    const record =
      body && typeof body === "object"
        ? (body as { eventType?: unknown; sectionName?: unknown; timestamp?: unknown })
        : {}
    const received = proposalEngagementEvent({
      proposalId,
      eventType: record.eventType,
      sectionName: record.sectionName,
      timestamp: engagementTimestamp(record.timestamp, new Date().toISOString()),
      userAgent: request.headers.get("user-agent") || "unknown",
    })
    if (!received.ok) return Response.json({ error: received.error }, { status: 400 })

    await Promise.all([
      forwardEngagement(received.event).catch(() => undefined),
      storeEngagement(received.event).catch(() => undefined),
    ])
    try {
      addProposalEvent(received.event)
    } catch {
      // A missed local write still accepts the event. The office reads the spool on the next tick.
    }

    return Response.json({
      success: true,
      event: received.event,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not record the proposal event."
    return Response.json({ error: message }, { status: 500 })
  }
}
