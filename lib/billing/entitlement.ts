import type { SubscriptionStatus } from "./access.ts"

export type PlanTier = "starter" | "pro" | "business"

export type PlanFeature =
  | "mobileEstimating"
  | "proposals"
  | "paintBuyLists"
  | "salesPipeline"
  | "bilingualWorkOrders"
  | "sketchAndNotes"
  | "videoProposals"
  | "voiceNotes"
  | "smartFollowUps"
  | "facebookMessenger"

export const PLAN_SEAT_LIMITS: Record<PlanTier, number> = {
  starter: 1,
  pro: 3,
  business: 5,
}

export function maxSeatsForPlan(tier: PlanTier = "pro", extraPaidSeats = 0): number {
  const base = PLAN_SEAT_LIMITS[tier] ?? 3
  return base + (tier === "business" ? Math.max(0, extraPaidSeats) : 0)
}

/** Paid access follows the live Paddle status. A scheduled cancel or pause does not revoke it. */
export function subscriptionGrantsAccess(status: string): boolean {
  const normalized = status.trim().toLowerCase()
  return normalized === "active" || normalized === "trialing"
}

/** Office gate uses the existing three statuses. Paused and past due close access. */
export function officeStatusFromPaddle(status: string): SubscriptionStatus | null {
  const normalized = status.trim().toLowerCase()
  if (normalized === "active") return "active"
  if (normalized === "trialing") return "trialing"
  if (normalized === "canceled" || normalized === "cancelled" || normalized === "paused" || normalized === "past_due") {
    return "canceled"
  }
  return null
}

/**
 * Checks if a company/plan has access to a specific feature.
 * During the 14-day free trial (status="trialing"), full access is enabled so contractors can evaluate everything.
 * Active subscriptions enforce tier-specific access.
 */
export function planHasFeatureAccess(
  tier: PlanTier = "pro",
  feature: PlanFeature,
  subscriptionStatus: string = "trialing",
): { allowed: boolean; requiredPlan?: PlanTier; reason?: string } {
  // During trial, full access is granted to all features
  if (subscriptionStatus === "trialing") {
    return { allowed: true }
  }

  // All plans have access to core estimating, proposals, buy lists, pipeline, bilingual crew sheets, sketch & notes
  if (
    feature === "mobileEstimating" ||
    feature === "proposals" ||
    feature === "paintBuyLists" ||
    feature === "salesPipeline" ||
    feature === "bilingualWorkOrders" ||
    feature === "sketchAndNotes"
  ) {
    return { allowed: true }
  }

  // Video proposals: Pro and Business
  if (feature === "videoProposals") {
    if (tier === "pro" || tier === "business") return { allowed: true }
    return {
      allowed: false,
      requiredPlan: "pro",
      reason: "Line-item video proposals are available on Pro and Business plans. Upgrade to attach video walkthroughs.",
    }
  }

  // Business only: Voice notes, smart follow-up reminders, Facebook Messenger
  if (feature === "voiceNotes" || feature === "smartFollowUps" || feature === "facebookMessenger") {
    if (tier === "business") return { allowed: true }
    const featureLabels: Record<string, string> = {
      voiceNotes: "Voice-to-Estimate Notes",
      smartFollowUps: "Smart 3 & 7-Day Follow-Up Reminders",
      facebookMessenger: "Facebook Messenger Lead Integration",
    }
    const label = featureLabels[feature] || "This feature"
    return {
      allowed: false,
      requiredPlan: "business",
      reason: `${label} is available on the Business plan. Upgrade to unlock.`,
    }
  }

  return { allowed: true }
}
