import type { SubscriptionStatus } from "./access.ts"

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
