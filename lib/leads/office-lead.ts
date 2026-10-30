import type { ScopeState } from "../data/seed.ts"
import { applyInboundLead } from "./apply.ts"

export type LeadReach = "call" | "text"

export function createOfficeLead(
  state: ScopeState,
  input: {
    name: string
    phone: string
    email: string
    address: string
    reachedBy: LeadReach
    now?: string
    id?: string
  },
): { ok: true; state: ScopeState; estimateId: string; clientId: string } | { ok: false; reason: string } {
  const name = input.name.trim()
  const phone = input.phone.trim()
  const email = input.email.trim()
  const address = input.address.trim()
  if (!name) return { ok: false, reason: "Enter the customer's name." }
  if (email && !email.includes("@")) return { ok: false, reason: "The email needs an @." }
  if (!phone && !email.includes("@")) return { ok: false, reason: "Add a phone number or an email." }
  const now = input.now ?? new Date().toISOString()
  const id = input.id ?? crypto.randomUUID()
  const texted = input.reachedBy === "text"
  const next = applyInboundLead(state, {
    id,
    source: texted ? "text" : "phone",
    name,
    phone,
    email,
    address,
    message: "",
    createdAt: now,
  })
  const created = next.estimates.find((item) => item.inboundLeadId === id)
  if (!created) return { ok: false, reason: "This lead could not be saved." }
  const estimates = next.estimates.map((item) =>
    item.id === created.id
      ? {
          ...item,
          title: address || "New lead",
          notes: texted ? "Reached by text." : "Reached by phone call.",
        }
      : item,
  )
  return {
    ok: true,
    state: { ...next, estimates },
    estimateId: created.id,
    clientId: created.clientId,
  }
}
