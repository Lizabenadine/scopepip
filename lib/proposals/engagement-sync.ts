import type { ProposalEngagementEvent } from "./engagement.ts"

export async function forwardEngagement(event: ProposalEngagementEvent): Promise<void> {
  const target = process.env.ENGAGEMENT_WEBHOOK_URL
  if (!target) return
  let url: URL
  try {
    url = new URL(target)
  } catch {
    return
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return
  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(event),
    signal: AbortSignal.timeout(2000),
  })
  if (!response.ok) throw new Error("Engagement webhook was not accepted.")
}

export async function storeEngagement(event: ProposalEngagementEvent): Promise<void> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) return
  const { createClient } = await import("@supabase/supabase-js")
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  )
  const { error } = await supabase.rpc("record_proposal_event", {
    proposal_id: event.proposalId,
    event_type: event.eventType,
    section_name: event.sectionName,
    user_agent: event.userAgent,
  })
  if (error) throw new Error(error.message)
}
