import { applyInboundLead } from "../leads/apply.ts"
import type { InboundLead } from "../leads/types.ts"
import { reconcileFollowUps } from "../follow-ups/schedule.ts"
import type { ScopeState } from "../data/seed.ts"
import { LEAD_SOURCES, type LeadSource } from "../types.ts"
import type { ZapierEvent } from "../zapier/events.ts"

const SOURCE_ALIASES: Record<string, LeadSource> = {
  website: "website",
  web: "website",
  thumbtack: "thumbtack",
  angi: "angi",
  angieslist: "angi",
  angi_s_list: "angi",
  angies_list: "angi",
  google_lsa: "google_lsa",
  googlelsa: "google_lsa",
  lsa: "google_lsa",
  google_local_services: "google_lsa",
  facebook: "facebook",
  fb: "facebook",
  yelp: "yelp",
  google: "google",
  referral: "referral",
  webhook: "webhook",
}

export function parseWebhookLead(body: unknown, now: string): { ok: true; lead: InboundLead } | { ok: false; reason: string } {
  const root = asRecord(body)
  if (!root) return { ok: false, reason: "Send the lead as JSON." }
  const person = asRecord(root.contact) ?? asRecord(root.customer) ?? asRecord(root.lead) ?? asRecord(root.data) ?? root
  const name = personName(person) || personName(root)
  const phone = pick(person, ["phone", "phoneNumber", "phone_number", "primaryPhone", "mobile"], 40) || pick(root, ["phone", "phone_number"], 40)
  const email = pick(person, ["email", "emailAddress", "email_address"], 120) || pick(root, ["email"], 120)
  if (!name) return { ok: false, reason: "A name is required." }
  if (!phone && !email) return { ok: false, reason: "A phone number or email is required." }
  const rawSource = pick(root, ["source", "leadSource", "lead_source"], 40) || pick(person, ["source", "lead_source"], 40)
  const source = sourceFrom(rawSource)
  const address = place(person.address) || place(root.address) || pick(root, ["address", "street"], 200)
  let message = pick(root, ["message", "description", "comments", "notes", "job_description"], 2000) || pick(person, ["message", "notes"], 2000)
  if (source === "webhook" && rawSource) message = message ? `Source: ${rawSource}\n${message}` : `Source: ${rawSource}`
  const givenId = pick(root, ["id", "leadId", "lead_id"], 80)
  return {
    ok: true,
    lead: {
      id: givenId || stableId([source, name, phone, email, message]),
      source,
      name,
      phone,
      email,
      address,
      message,
      createdAt: now,
    },
  }
}

export function landWebhookLead(
  state: ScopeState,
  lead: InboundLead,
  now: string,
): { state: ScopeState; created: boolean; estimateId: string | null } {
  const next = reconcileFollowUps(applyInboundLead(state, lead), now)
  const estimate = next.estimates.find((item) => item.inboundLeadId === lead.id) ?? null
  return {
    state: next,
    created: next.estimates.length > state.estimates.length,
    estimateId: estimate?.id ?? null,
  }
}

export function webhookZapierEvent(state: ScopeState, estimateId: string): ZapierEvent | null {
  const estimate = state.estimates.find((item) => item.id === estimateId)
  if (!estimate?.inboundLeadId) return null
  const client = state.clients.find((item) => item.id === estimate.clientId)
  return {
    id: `lead:${estimate.id}`,
    event: "lead.created",
    occurredAt: estimate.createdAt,
    client: {
      name: client?.name ?? "Client",
      email: client?.email ?? "",
      phone: client?.phone ?? "",
    },
    job: { id: estimate.id, title: estimate.title, address: estimate.jobAddress },
  }
}

function sourceFrom(value: string): LeadSource {
  const key = value.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "")
  const alias = SOURCE_ALIASES[key]
  if (alias) return alias
  return LEAD_SOURCES.find((item) => item === key) ?? "webhook"
}

function stableId(parts: string[]): string {
  let hash = 5381
  const text = parts.join("|")
  for (let index = 0; index < text.length; index += 1) hash = Math.imul(hash, 33) ^ text.charCodeAt(index)
  return `wh_${(hash >>> 0).toString(16)}`
}

function personName(record: Record<string, unknown>): string {
  const full = pick(record, ["name", "fullName", "full_name", "customerName"], 120)
  if (full) return full
  return [pick(record, ["firstName", "first_name"], 60), pick(record, ["lastName", "last_name"], 60)].filter(Boolean).join(" ").slice(0, 120)
}

function place(value: unknown): string {
  if (typeof value === "string") return value.trim().slice(0, 200)
  const record = asRecord(value)
  if (!record) return ""
  return [pick(record, ["address", "street", "address1"], 120), pick(record, ["city"], 60), pick(record, ["state"], 40), pick(record, ["zip", "postal_code"], 20)]
    .filter(Boolean)
    .join(", ")
    .slice(0, 200)
}

function pick(record: Record<string, unknown>, keys: string[], max: number): string {
  for (const key of keys) {
    const value = record[key]
    if (typeof value === "string" && value.trim()) return value.trim().slice(0, max)
  }
  return ""
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null
  return value as Record<string, unknown>
}
