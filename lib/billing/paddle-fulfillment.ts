import { saveBillingStatus } from "../auth/directory.ts"
import { officeStatusFromPaddle, type PlanTier } from "./entitlement.ts"
import { isExtraSeatPriceId, planTierFromPriceId } from "./pricing.ts"
import { upsertCustomer, upsertSubscription, type CustomerMirror, type SubscriptionMirror } from "./paddle-mirror.ts"
import { processPaddleRefund, recordCommissionFromPaddle } from "../affiliates/affiliate-store.ts"

const SUBSCRIPTION_EVENTS = new Set([
  "subscription.created",
  "subscription.updated",
  "subscription.canceled",
  "subscription.paused",
  "subscription.past_due",
  "subscription.activated",
  "subscription.trialing",
  "subscription.resumed",
])

const CUSTOMER_EVENTS = new Set(["customer.created", "customer.updated"])

interface SubscriptionNotice {
  id?: string
  status?: string
  customerId?: string
  createdAt?: string
  updatedAt?: string
  scheduledChange?: { action?: string; effectiveAt?: string } | null
  items?: { price?: { id?: string; productId?: string } | null; product?: { id?: string } | null; quantity?: number }[]
  customData?: unknown
}

interface CustomerNotice {
  id?: string
  email?: string
  createdAt?: string
  updatedAt?: string
}

interface TransactionNotice {
  customerId?: string | null
  customData?: unknown
  updatedAt?: string
  createdAt?: string
}

export function subscriptionMirror(data: SubscriptionNotice): SubscriptionMirror | null {
  const subscriptionId = text(data.id)
  const customerId = text(data.customerId)
  const status = text(data.status)
  const item = data.items?.[0]
  const priceId = text(item?.price?.id)
  const productId = text(item?.price?.productId) || text(item?.product?.id)
  const createdAt = text(data.createdAt)
  const updatedAt = text(data.updatedAt)
  if (!subscriptionId || !customerId || !status || !priceId || !productId || !createdAt || !updatedAt) return null
  return {
    subscriptionId,
    customerId,
    status,
    priceId,
    productId,
    scheduledChangeAction: text(data.scheduledChange?.action) || null,
    scheduledChangeAt: text(data.scheduledChange?.effectiveAt) || null,
    createdAt,
    updatedAt,
  }
}

export function customerMirror(data: CustomerNotice): CustomerMirror | null {
  const customerId = text(data.id)
  const email = text(data.email).toLowerCase()
  const createdAt = text(data.createdAt)
  const updatedAt = text(data.updatedAt)
  if (!customerId || !email.includes("@") || !createdAt || !updatedAt) return null
  return { customerId, email, createdAt, updatedAt }
}

export async function handleVerifiedPaddleEvent(event: { eventType: string; data: unknown }): Promise<{ type: string; ignored?: boolean }> {
  const data = notice(event.data)
  if (SUBSCRIPTION_EVENTS.has(event.eventType)) {
    const subscription = subscriptionMirror(data)
    if (!subscription) throw new Error("The Paddle subscription could not be read.")
    const customerId = subscription.customerId
    const email = customText(data.customData, "email")
    if (email.includes("@")) {
      await upsertCustomer({
        customerId,
        email,
        createdAt: subscription.createdAt,
        updatedAt: subscription.updatedAt,
      })
    }
    await upsertSubscription(subscription)
    const officeStatus = officeStatusFromPaddle(subscription.status)
    if (officeStatus) {
      const rawPlanTier = customText(data.customData, "plan_tier").toLowerCase()
      let planTier: PlanTier | undefined =
        rawPlanTier === "starter" || rawPlanTier === "pro" || rawPlanTier === "business"
          ? (rawPlanTier as PlanTier)
          : undefined

      if (!planTier && subscription.priceId) {
        planTier = planTierFromPriceId(subscription.priceId)
      }

      let extraSeats: number | undefined
      if (Array.isArray(data.items)) {
        for (const item of data.items) {
          const itemPriceId = text(item?.price?.id)
          if (itemPriceId && isExtraSeatPriceId(itemPriceId)) {
            extraSeats = typeof item.quantity === "number" ? item.quantity : 1
          }
        }
      }

      await saveBillingStatus({
        userId: customText(data.customData, "user_id"),
        officeUserId: customText(data.customData, "office_user_id"),
        email,
        status: officeStatus,
        planTier,
        extraSeats,
      })
    }
    return { type: event.eventType }
  }
  if (CUSTOMER_EVENTS.has(event.eventType)) {
    const customer = customerMirror(data)
    if (!customer) throw new Error("The Paddle customer could not be read.")
    await upsertCustomer(customer)
    return { type: event.eventType }
  }
  if (event.eventType === "transaction.completed") {
    const email = customText(data.customData, "email")
    const customer = customerMirror({
      id: data.customerId ?? undefined,
      email,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    })
    if (customer) await upsertCustomer(customer)

    // Record affiliate commission on paid settlement
    const transactionId = text((data as Record<string, unknown>).id)
    const rawDetails = (data as Record<string, unknown>).details as Record<string, unknown> | undefined
    const totals = rawDetails?.totals as Record<string, unknown> | undefined
    const planTierName = customText(data.customData, "plan_tier").toLowerCase()
    const defaultPlanAmount = planTierName === "starter" ? 29.0 : planTierName === "business" ? 79.0 : 49.0
    const rawAmount = typeof totals?.total === "string" ? parseFloat(totals.total) : typeof totals?.total === "number" ? totals.total : defaultPlanAmount
    const companyId = customText(data.customData, "company_id")
    const subscriptionId = text((data as Record<string, unknown>).subscription_id) || text((data as Record<string, unknown>).subscriptionId)

    if (transactionId) {
      await recordCommissionFromPaddle({
        transactionId,
        amount: rawAmount > 0 ? rawAmount : defaultPlanAmount,
        customerEmail: email,
        companyId,
        subscriptionId,
      }).catch(() => null)
    }

    return { type: event.eventType }
  }
  if (event.eventType === "transaction.refunded" || event.eventType === "payment.refunded") {
    const transactionId = text((data as Record<string, unknown>).id)
    if (transactionId) {
      await processPaddleRefund(transactionId).catch(() => null)
    }
    return { type: event.eventType }
  }
  return { type: event.eventType, ignored: true }
}

function notice(value: unknown): SubscriptionNotice & CustomerNotice & TransactionNotice {
  if (!value || typeof value !== "object") return {}
  return value as SubscriptionNotice & CustomerNotice & TransactionNotice
}

function customText(custom: unknown, key: string): string {
  if (!custom || typeof custom !== "object") return ""
  const value = (custom as Record<string, unknown>)[key]
  return typeof value === "string" ? value.trim() : ""
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : ""
}
