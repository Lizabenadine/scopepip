import { createHmac, timingSafeEqual } from "node:crypto"
import type { SubscriptionStatus } from "./access.ts"

export interface PaddleSubscriptionEvent {
  event: "subscription_created" | "subscription_updated" | "subscription_cancelled"
  status: SubscriptionStatus
  userId: string
  officeUserId: string
  email: string
  subscriptionId: string
}

const FIVE_MINUTES_MS = 5 * 60 * 1000

const CREATED = new Set(["subscription_created", "subscription.created"])
const UPDATED = new Set(["subscription_updated", "subscription.updated"])
const CANCELLED = new Set(["subscription_cancelled", "subscription.canceled", "subscription.cancelled"])

/** Paddle signs `ts:rawBody` and sends `ts=...;h1=...` in Paddle-Signature. */
export function paddleSignatureMatches(raw: string, header: string, secret: string, nowMs = Date.now()): boolean {
  if (!secret || !header) return false
  const fields = headerFields(header)
  const ts = fields.ts
  const h1 = fields.h1
  if (!ts || !h1 || !/^\d+$/.test(ts)) return false
  const sentAt = Number(ts) * 1000
  if (!Number.isFinite(sentAt) || Math.abs(nowMs - sentAt) > FIVE_MINUTES_MS) return false
  const digest = createHmac("sha256", secret).update(`${ts}:${raw}`).digest("hex")
  const actual = Buffer.from(h1)
  const wanted = Buffer.from(digest)
  if (actual.length !== wanted.length) return false
  return timingSafeEqual(actual, wanted)
}

export function readPaddleEvent(value: unknown): PaddleSubscriptionEvent | { ignored: true } | { error: string } {
  if (!value || typeof value !== "object") return { error: "The Paddle event could not be read." }
  const body = value as { alert_name?: unknown; event_type?: unknown; data?: unknown }
  const eventName = text(body.alert_name) || text(body.event_type)
  const kind = eventKind(eventName)
  if (!kind) return { ignored: true }
  const data = recordOf(body.data)
  const customer = recordOf(data.customer)
  const custom = recordOf(data.custom_data)
  const providerStatus = text(data.status)
  const status = kind === "subscription_cancelled" ? "canceled" : statusFromPaddle(providerStatus)
  if (!status) return { error: "The subscription status was not recognized." }
  const email = (text(customer.email) || text(data.user_email)).toLowerCase()
  const userId = text(custom.user_id)
  const officeUserId = text(custom.office_user_id)
  if (!userId && !officeUserId && !email.includes("@")) return { error: "The Paddle event has no account." }
  return {
    event: kind,
    status,
    userId,
    officeUserId,
    email,
    subscriptionId: text(data.id),
  }
}

function eventKind(name: string): PaddleSubscriptionEvent["event"] | null {
  if (CREATED.has(name)) return "subscription_created"
  if (UPDATED.has(name)) return "subscription_updated"
  if (CANCELLED.has(name)) return "subscription_cancelled"
  return null
}

function statusFromPaddle(status: string): SubscriptionStatus | null {
  const normalized = status.trim().toLowerCase()
  if (normalized === "active") return "active"
  if (normalized === "trialing" || normalized === "on_trial") return "trialing"
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
  return null
}

function headerFields(header: string): Record<string, string> {
  const fields: Record<string, string> = {}
  for (const part of header.split(";")) {
    const eq = part.indexOf("=")
    if (eq < 1) continue
    fields[part.slice(0, eq).trim()] = part.slice(eq + 1).trim()
  }
  return fields
}

function recordOf(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object") return {}
  return value as Record<string, unknown>
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : ""
}
