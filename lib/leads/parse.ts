import type { InboundLeadSource } from "../types.ts"
import type { InboundLead, ParsedInbound, RejectedInbound } from "./types.ts"

const PHONE_KEYS = ["phone", "phoneNumber", "phone_number", "primaryPhone", "primary_phone", "mobile"]
const EMAIL_KEYS = ["email", "emailAddress", "email_address"]
const MESSAGE_KEYS = ["message", "description", "comments", "jobDescription", "job_description"]

export function parseInbound(
  source: InboundLeadSource,
  body: unknown,
  now: string,
): ParsedInbound | RejectedInbound {
  if (source === "facebook") return parseFacebook(body, now)
  const lead =
    source === "website"
      ? parseWebsite(body, now)
      : source === "thumbtack"
        ? parseThumbtack(body, now)
        : source === "angi"
          ? parseAngi(body, now)
          : parseGoogleLsa(body, now)
  if (!lead) {
    return {
      ok: false,
      reason:
        source === "website"
          ? "A name and a phone number are required."
          : "A name and a phone number or email are required.",
    }
  }
  return { ok: true, leads: [lead] }
}

function parseWebsite(body: unknown, now: string): InboundLead | null {
  const root = asRecord(body)
  if (!root) return null
  return finish(
    "website",
    pick(root, ["id"], 80),
    personName(root),
    pick(root, PHONE_KEYS, 40),
    pick(root, EMAIL_KEYS, 120),
    place(root.address) || pick(root, ["address"], 200),
    pick(root, MESSAGE_KEYS, 2000),
    now,
    true,
  )
}

function parseThumbtack(body: unknown, now: string): InboundLead | null {
  const root = asRecord(body)
  if (!root) return null
  const data = asRecord(root.data) ?? asRecord(root.lead) ?? root
  const customer = asRecord(data.customer) ?? asRecord(data.contact) ?? data
  const request = asRecord(data.request) ?? data
  return finish(
    "thumbtack",
    pick(data, ["leadID", "leadId", "lead_id", "negotiationID"], 80) || pick(root, ["leadID", "leadId"], 80),
    personName(customer) || personName(data),
    pick(customer, PHONE_KEYS, 40) || pick(data, PHONE_KEYS, 40),
    pick(customer, EMAIL_KEYS, 120) || pick(data, EMAIL_KEYS, 120),
    place(request.location) || place(data.location) || place(customer.address),
    pick(request, MESSAGE_KEYS, 2000) || pick(data, MESSAGE_KEYS, 2000),
    now,
  )
}

function parseAngi(body: unknown, now: string): InboundLead | null {
  const root = asRecord(body)
  if (!root) return null
  const lead = asRecord(root.lead) ?? root
  const address = [place(lead.address) || pick(lead, ["address", "address1", "street"], 120), pick(lead, ["city"], 60), pick(lead, ["state"], 40), pick(lead, ["zip", "postalCode", "postal_code"], 20)]
    .filter(Boolean)
    .join(", ")
    .slice(0, 200)
  return finish(
    "angi",
    pick(lead, ["leadId", "lead_id", "srOid", "sr_oid"], 80),
    personName(lead),
    pick(lead, PHONE_KEYS, 40),
    pick(lead, EMAIL_KEYS, 120),
    address,
    pick(lead, MESSAGE_KEYS, 2000),
    now,
  )
}

function parseGoogleLsa(body: unknown, now: string): InboundLead | null {
  const root = asRecord(body)
  if (!root) return null
  const nested = asRecord(root.lead)
  const contact = asRecord(root.contactDetails) ?? asRecord(nested?.contactDetails) ?? root
  return finish(
    "google_lsa",
    pick(root, ["leadId", "lead_id"], 80) || pick(nested ?? {}, ["leadId", "lead_id"], 80),
    personName(contact),
    pick(contact, PHONE_KEYS, 40),
    pick(contact, EMAIL_KEYS, 120),
    place(root.address) || place(contact.address),
    pick(root, MESSAGE_KEYS, 2000) || pick(nested ?? {}, MESSAGE_KEYS, 2000),
    now,
  )
}

function parseFacebook(body: unknown, now: string): ParsedInbound | RejectedInbound {
  const root = asRecord(body)
  if (!root) return { ok: false, reason: "A name and a phone number or email are required." }
  const leads: InboundLead[] = []
  let acknowledged = false
  const direct = fieldDataLead(root, now)
  if (direct) leads.push(direct)
  const entries = Array.isArray(root.entry) ? root.entry : []
  for (const entry of entries) {
    const changes = asRecord(entry)
    const list = changes && Array.isArray(changes.changes) ? changes.changes : []
    for (const change of list) {
      const value = asRecord(asRecord(change)?.value)
      if (!value) continue
      if (typeof value.field === "string" && value.field !== "leadgen") continue
      const parsed = fieldDataLead(value, now)
      if (parsed) leads.push(parsed)
      else if (typeof value.leadgen_id === "string" && value.leadgen_id.trim()) acknowledged = true
    }
  }
  if (leads.length === 0 && !acknowledged) {
    return { ok: false, reason: "A name and a phone number or email are required." }
  }
  return { ok: true, leads }
}

function fieldDataLead(record: Record<string, unknown>, now: string): InboundLead | null {
  if (!Array.isArray(record.field_data)) return null
  const fields = new Map<string, string>()
  for (const field of record.field_data) {
    const item = asRecord(field)
    if (!item || typeof item.name !== "string") continue
    const values = Array.isArray(item.values) ? item.values : []
    const value = values.find((entry): entry is string => typeof entry === "string" && entry.trim().length > 0)
    if (value) fields.set(item.name, value.trim())
  }
  const name = fields.get("full_name") || [fields.get("first_name"), fields.get("last_name")].filter(Boolean).join(" ")
  const address = [fields.get("street_address"), fields.get("city"), fields.get("state"), fields.get("zip_code")]
    .filter(Boolean)
    .join(", ")
    .slice(0, 200)
  return finish(
    "facebook",
    text(record.id, 80) || text(record.leadgen_id, 80),
    name.slice(0, 120),
    (fields.get("phone_number") || fields.get("phone") || "").slice(0, 40),
    (fields.get("email") || "").slice(0, 120),
    address,
    (fields.get("job_description") || fields.get("message") || fields.get("comments") || "").slice(0, 2000),
    now,
  )
}

function finish(
  source: InboundLeadSource,
  id: string,
  name: string,
  phone: string,
  email: string,
  address: string,
  message: string,
  now: string,
  phoneRequired = false,
): InboundLead | null {
  const cleanName = name.trim().slice(0, 120)
  const cleanPhone = phone.trim().slice(0, 40)
  const cleanEmail = email.trim().slice(0, 120)
  if (!cleanName) return null
  if (phoneRequired && !cleanPhone) return null
  if (!cleanPhone && !cleanEmail) return null
  return {
    id: id.trim().slice(0, 80) || crypto.randomUUID(),
    source,
    name: cleanName,
    phone: cleanPhone,
    email: cleanEmail,
    address: address.trim().slice(0, 200),
    message: message.trim().slice(0, 2000),
    createdAt: now,
  }
}

function personName(record: Record<string, unknown>): string {
  const full = pick(record, ["name", "fullName", "full_name", "customerName", "consumerName"], 120)
  if (full) return full
  return [pick(record, ["firstName", "first_name"], 60), pick(record, ["lastName", "last_name"], 60)]
    .filter(Boolean)
    .join(" ")
    .slice(0, 120)
}

function place(value: unknown): string {
  if (typeof value === "string") return value.trim().slice(0, 200)
  const record = asRecord(value)
  if (!record) return ""
  return [pick(record, ["address", "address1", "street"], 120), pick(record, ["city"], 60), pick(record, ["state"], 40), pick(record, ["zip", "zipCode", "postalCode"], 20)]
    .filter(Boolean)
    .join(", ")
    .slice(0, 200)
}

function pick(record: Record<string, unknown>, keys: string[], max: number): string {
  for (const key of keys) {
    const value = text(record[key], max)
    if (value) return value
  }
  return ""
}

function text(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : ""
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null
  return value as Record<string, unknown>
}
