import type { Client, Estimate, LeadSource } from "../types.ts"
import { salesStageOf } from "./board.ts"

const SOURCE_POINTS: Record<LeadSource, number> = {
  referral: 15,
  google: 12,
  website: 12,
  google_lsa: 12,
  thumbtack: 8,
  angi: 8,
  yelp: 8,
  facebook: 8,
}

const STAGE_POINTS: Record<string, number> = {
  cold: 4,
  warm: 10,
  estimate_requested: 16,
  estimate_scheduled: 20,
  proposal_sent: 24,
}

export interface LeadScore {
  score: number
  reasons: string[]
}

export function leadScore(estimate: Estimate, client: Client | undefined, replied: boolean): LeadScore {
  const reasons: string[] = []
  let score = 0
  const add = (points: number, reason: string) => {
    if (points === 0) return
    score += points
    reasons.push(reason)
  }
  if (digits(client?.phone).length >= 10) add(10, "Has a phone")
  if (client?.email.includes("@")) add(10, "Has an email")
  if ((estimate.jobAddress || client?.address || "").trim()) add(10, "Has an address")
  if (estimate.areas.length > 0 || estimate.lineItems.length > 0) add(15, "Scope is priced")
  if (estimate.leadSource) add(SOURCE_POINTS[estimate.leadSource] ?? 0, `Source: ${estimate.leadSource}`)
  const stage = salesStageOf(estimate)
  if (stage) add(STAGE_POINTS[stage] ?? 0, `Stage: ${stage}`)
  if (estimate.estimateVisitOn) add(8, "Visit booked")
  if ((estimate.proposalOpens ?? []).length > 0) add(8, "Opened the proposal")
  if (replied) add(10, "Customer replied")
  if ((estimate.tags ?? []).some((tag) => tag.toLowerCase() === "below min.")) add(-12, "Below the minimum")
  return { score: Math.max(0, Math.min(100, score)), reasons }
}

function digits(phone: string | undefined): string {
  return (phone ?? "").replace(/\D/g, "")
}
