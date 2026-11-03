import { supabaseAdmin } from "../supabase/admin.ts"

export interface CustomerMirror {
  customerId: string
  email: string
  createdAt: string
  updatedAt: string
}

export interface SubscriptionMirror {
  subscriptionId: string
  customerId: string
  status: string
  priceId: string
  productId: string
  scheduledChangeAction: string | null
  scheduledChangeAt: string | null
  createdAt: string
  updatedAt: string
}

export function incomingIsCurrent(storedUpdatedAt: string | null | undefined, incomingUpdatedAt: string): boolean {
  if (!storedUpdatedAt) return true
  const stored = Date.parse(storedUpdatedAt)
  const incoming = Date.parse(incomingUpdatedAt)
  if (!Number.isFinite(stored) || !Number.isFinite(incoming)) return true
  return incoming >= stored
}

export async function upsertCustomer(customer: CustomerMirror): Promise<boolean> {
  const admin = supabaseAdmin()
  if (!admin) return false
  const existing = await admin.from("customers").select("updated_at").eq("customer_id", customer.customerId).maybeSingle()
  if (existing.error) throw new Error("The Paddle customer could not be read.")
  if (!incomingIsCurrent(existing.data?.updated_at, customer.updatedAt)) return true
  const saved = await admin.from("customers").upsert(
    {
      customer_id: customer.customerId,
      email: customer.email,
      created_at: customer.createdAt,
      updated_at: customer.updatedAt,
    },
    { onConflict: "customer_id" },
  )
  if (saved.error) throw new Error("The Paddle customer could not be saved.")
  return true
}

export async function upsertSubscription(subscription: SubscriptionMirror): Promise<boolean> {
  const admin = supabaseAdmin()
  if (!admin) return false
  const existing = await admin
    .from("subscriptions")
    .select("updated_at")
    .eq("subscription_id", subscription.subscriptionId)
    .maybeSingle()
  if (existing.error) throw new Error("The Paddle subscription could not be read.")
  if (!incomingIsCurrent(existing.data?.updated_at, subscription.updatedAt)) return true
  const saved = await admin.from("subscriptions").upsert(
    {
      subscription_id: subscription.subscriptionId,
      customer_id: subscription.customerId,
      status: subscription.status,
      price_id: subscription.priceId,
      product_id: subscription.productId,
      scheduled_change_action: subscription.scheduledChangeAction,
      scheduled_change_at: subscription.scheduledChangeAt,
      created_at: subscription.createdAt,
      updated_at: subscription.updatedAt,
    },
    { onConflict: "subscription_id" },
  )
  if (saved.error) throw new Error("The Paddle subscription could not be saved.")
  return true
}

export async function customerIdForEmail(email: string): Promise<string | null> {
  const admin = supabaseAdmin()
  const normalized = email.trim().toLowerCase()
  if (!admin || !normalized.includes("@")) return null
  const found = await admin
    .from("customers")
    .select("customer_id")
    .eq("email", normalized)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle()
  if (found.error) throw new Error("The Paddle customer could not be read.")
  return found.data?.customer_id ?? null
}

export async function subscriptionIdsForCustomer(customerId: string): Promise<string[]> {
  const admin = supabaseAdmin()
  if (!admin || !customerId) return []
  const found = await admin.from("subscriptions").select("subscription_id").eq("customer_id", customerId)
  if (found.error) throw new Error("The Paddle subscription could not be read.")
  return (found.data ?? []).map((row) => row.subscription_id).filter((id): id is string => Boolean(id))
}
