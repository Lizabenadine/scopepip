import type { ScopeState } from "../data/seed.ts"
import { phoneKey } from "../messages/thread.ts"
import type { Client, Estimate } from "../types.ts"
import { createWorkOrder } from "../work-orders/defaults.ts"
import type { InboundLead } from "./types.ts"

export function applyInboundLead(state: ScopeState, lead: InboundLead): ScopeState {
  if (state.estimates.some((estimate) => estimate.inboundLeadId === lead.id)) return state
  const now = lead.createdAt
  const existing = clientForLead(state.clients, lead)
  const clientId = existing?.id ?? crypto.randomUUID()
  const clients = existing
    ? state.clients.map((client) => (client.id === clientId ? fillClient(client, lead, now) : client))
    : [newClient(clientId, lead, now), ...state.clients]
  const estimate = newEstimate(state, lead, clientId)
  return {
    ...state,
    clients,
    estimates: [estimate, ...state.estimates],
    workOrders: [createWorkOrder(estimate), ...state.workOrders],
  }
}

function clientForLead(clients: Client[], lead: InboundLead): Client | null {
  const key = phoneKey(lead.phone)
  if (key) {
    const match = clients.find((client) => phoneKey(client.phone) === key)
    if (match) return match
  }
  const email = lead.email.trim().toLowerCase()
  if (!email) return null
  return clients.find((client) => client.email.trim().toLowerCase() === email) ?? null
}

function fillClient(client: Client, lead: InboundLead, now: string): Client {
  return {
    ...client,
    phone: client.phone.trim() || lead.phone,
    email: client.email.trim() || lead.email,
    address: client.address.trim() || lead.address,
    updatedAt: now,
  }
}

function newClient(id: string, lead: InboundLead, now: string): Client {
  return {
    id,
    name: lead.name,
    phone: lead.phone,
    email: lead.email,
    address: lead.address,
    notes: "",
    createdAt: now,
    updatedAt: now,
  }
}

function newEstimate(state: ScopeState, lead: InboundLead, clientId: string): Estimate {
  const stageId = state.stages.find((stage) => stage.slug === "lead")?.id ?? state.stages[0]?.id ?? "stage-lead"
  const line = lead.message.split("\n")[0]?.trim() ?? ""
  const title = line ? line.slice(0, 80) : "Painting inquiry"
  return {
    id: crypto.randomUUID(),
    clientId,
    stageId,
    title,
    jobAddress: lead.address,
    areas: [],
    lineItems: [],
    rates: state.productionRates.map((rate) => ({
      ...rate,
      coatRates: rate.coatRates.map((entry) => ({ ...entry })),
    })),
    settings: { ...state.estimateSettings },
    scheduledOn: null,
    notes: lead.message,
    crewNote: "",
    acceptedAt: null,
    publicToken: crypto.randomUUID().replace(/-/g, "").slice(0, 12),
    clientStatus: "draft",
    signature: null,
    paymentStatus: "unpaid",
    depositReceipt: null,
    leadSource: lead.source,
    inboundLeadId: lead.id,
    tags: [],
    salesperson: "",
    salesStage: "cold",
    createdAt: lead.createdAt,
    updatedAt: lead.createdAt,
  }
}
