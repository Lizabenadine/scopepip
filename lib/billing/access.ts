export const TRIAL_DAYS = 14

export const SUBSCRIPTION_STATUSES = ["trialing", "active", "canceled"] as const

export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUSES)[number]

export interface SubscriptionAccess {
  status: SubscriptionStatus
  trialEndsAt: string | null
}

export function trialEndsAt(now: Date): string {
  return new Date(now.getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000).toISOString()
}

export function isSubscriptionStatus(value: string): value is SubscriptionStatus {
  return (SUBSCRIPTION_STATUSES as readonly string[]).includes(value)
}

/** Estimator and dashboard stay open during the trial or an active subscription. */
export function subscriptionAllows(access: SubscriptionAccess, nowMs: number): boolean {
  if (access.status === "active") return true
  if (access.status !== "trialing") return false
  const ends = access.trialEndsAt ? Date.parse(access.trialEndsAt) : NaN
  return Number.isFinite(ends) && ends > nowMs
}

/** Dashboard and estimator routes. Billing, proposals, and crew sheets stay reachable. */
export function guardedPath(pathname: string): boolean {
  if (pathname === "/" || pathname === "/dashboard") return true
  if (pathname === "/estimate" || pathname.startsWith("/estimate/")) return true
  return pathname === "/estimates" || pathname.startsWith("/estimates/")
}
