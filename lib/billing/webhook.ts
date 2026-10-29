import { createHmac, timingSafeEqual } from "node:crypto"
import { isSubscriptionStatus, type SubscriptionStatus } from "./access.ts"

export interface BillingEvent {
  event: "subscription_created" | "subscription_updated" | "subscription_cancelled"
  status: SubscriptionStatus
  trialEndsAt: string | null
  userId: string
  officeUserId: string
  email: string
}

const EVENTS = new Set(["subscription_created", "subscription_updated", "subscription_cancelled"])

export function billingSignatureMatches(raw: string, signature: string, secret: string): boolean {
  if (!secret || !signature) return false
  const digest = createHmac("sha256", secret).update(raw).digest("hex")
  const actual = Buffer.from(signature)
  const wanted = Buffer.from(digest)
  if (actual.length !== wanted.length) return false
  return timingSafeEqual(actual, wanted)
}

export function readBillingEvent(value: unknown): BillingEvent | { ignored: true } | { error: string } {
  if (!value || typeof value !== "object") return { error: "The billing event could not be read." }
  const body = value as { meta?: { event_name?: unknown; custom_data?: unknown }; data?: { attributes?: unknown } }
  const eventName = typeof body.meta?.event_name === "string" ? body.meta.event_name : ""
  if (!EVENTS.has(eventName)) return { ignored: true }
  const event = eventName as BillingEvent["event"]
  const attributes = recordOf(body.data?.attributes)
  const custom = recordOf(body.meta?.custom_data)
  const providerStatus = typeof attributes.status === "string" ? attributes.status : ""
  const status = event === "subscription_cancelled" ? "canceled" : statusFromProvider(providerStatus)
  if (!status) return { error: "The subscription status was not recognized." }
  const trialEndsAt = typeof attributes.trial_ends_at === "string" && attributes.trial_ends_at ? attributes.trial_ends_at : null
  const userId = text(custom.user_id)
  const officeUserId = text(custom.office_user_id)
  const email = text(attributes.user_email).toLowerCase()
  if (!userId && !officeUserId && !email.includes("@")) return { error: "The billing event has no account." }
  return { event, status, trialEndsAt, userId, officeUserId, email }
}

function statusFromProvider(status: string): SubscriptionStatus | null {
  const normalized = status.trim().toLowerCase()
  if (normalized === "active") return "active"
  if (normalized === "on_trial" || normalized === "trialing") return "trialing"
  if (
    normalized === "cancelled" ||
    normalized === "canceled" ||
    normalized === "expired" ||
    normalized === "unpaid" ||
    normalized === "past_due" ||
    normalized === "paused"
  ) {
    return "canceled"
  }
  return isSubscriptionStatus(normalized) ? normalized : null
}

function recordOf(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object") return {}
  return value as Record<string, unknown>
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : ""
}
