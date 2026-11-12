import type { Client, Estimate } from "../types.ts"
import { salesStageOf } from "./board.ts"

export interface SmartFollowUpReminder {
  milestone: "3d" | "7d"
  daysElapsed: number
  label: string
  suggestedMessage: string
  dismissKey: string
  clientPhone?: string
  clientEmail?: string
}

/**
 * Returns when an estimate was sent to the customer, or null if it was never sent.
 */
export function sentAtOf(estimate: Estimate): string | null {
  // 1. Explicit stage change recording
  const sentStage = estimate.stageChanges?.find((c) => c.label.toLowerCase().includes("sent"))?.at
  if (sentStage) return sentStage

  // 2. Proposal sent follow-up sequence enrollment
  if (estimate.followUp?.stage === "proposal_sent" && estimate.followUp.startedAt) {
    return estimate.followUp.startedAt
  }

  // 3. Activity history
  const sentActivity = estimate.activity?.find(
    (a) => a.label.toLowerCase().includes("sent"),
  )?.at
  if (sentActivity) return sentActivity

  // 4. Status or sales stage indicates sent
  if (estimate.clientStatus === "sent" || salesStageOf(estimate) === "proposal_sent") {
    return estimate.updatedAt || estimate.createdAt
  }

  return null
}

/**
 * Evaluates whether an estimate should display a 3-day or 7-day follow-up reminder.
 * Automatically stops when the estimate is accepted, declined, or scheduled.
 */
export function getSmartFollowUpReminder(input: {
  estimate: Estimate
  client?: Client
  nowMs?: number
  dismissedKeys?: Set<string> | string[]
}): SmartFollowUpReminder | null {
  const { estimate, client } = input

  // Automatic stopping conditions:
  // 1. Archived
  if (estimate.archived) return null

  // 2. Accepted
  if (estimate.clientStatus === "accepted" || estimate.acceptedAt) return null

  // 3. Declined
  if (estimate.clientStatus === "declined" || estimate.declinedAt) return null

  // 4. Job is scheduled or paid
  if (estimate.scheduledOn) return null
  if (estimate.paymentStatus === "deposit_paid" || estimate.paymentStatus === "paid") return null

  // Must be in a sent state
  const isSent =
    estimate.clientStatus === "sent" ||
    salesStageOf(estimate) === "proposal_sent" ||
    Boolean(estimate.stageChanges?.some((c) => c.label.toLowerCase().includes("sent")))

  if (!isSent) return null

  const sentAt = sentAtOf(estimate)
  if (!sentAt) return null

  const sentMs = new Date(sentAt).getTime()
  if (Number.isNaN(sentMs)) return null

  const nowMs = input.nowMs ?? Date.now()
  const diffMs = nowMs - sentMs
  if (diffMs < 0) return null

  const daysElapsed = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  // Reminders trigger at 3+ days and 7+ days
  if (daysElapsed < 3) return null

  const milestone: "3d" | "7d" = daysElapsed >= 7 ? "7d" : "3d"
  const dismissKey = `dismissed-followup-${milestone}`

  // Check if dismissed via estimate tags
  if (estimate.tags?.includes(dismissKey)) return null

  // Check if dismissed via passed keys set / array
  if (input.dismissedKeys) {
    const keys = input.dismissedKeys instanceof Set ? input.dismissedKeys : new Set(input.dismissedKeys)
    if (keys.has(dismissKey) || keys.has(`${estimate.id}:${milestone}`)) {
      return null
    }
  }

  const rawName = client?.name?.trim() || "there"
  const firstName = rawName.split(" ")[0] || rawName
  const projectTitle = estimate.title?.trim() || estimate.jobAddress?.trim() || "painting proposal"

  const label =
    milestone === "7d"
      ? `Follow-up reminder (${daysElapsed} days since sent)`
      : `Follow-up reminder (${daysElapsed} days since sent)`

  const suggestedMessage =
    milestone === "7d"
      ? `Hi ${firstName}, following up on the proposal for ${projectTitle}. We're finalizing our upcoming production schedule—let me know if you would still like to move forward or have any questions!`
      : `Hi ${firstName}, just checking in to see if you had any questions about the painting proposal for ${projectTitle}. Happy to adjust any details or discuss whenever you're ready!`

  return {
    milestone,
    daysElapsed,
    label,
    suggestedMessage,
    dismissKey,
    clientPhone: client?.phone?.trim() || undefined,
    clientEmail: client?.email?.trim() || undefined,
  }
}
