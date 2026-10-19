import type { ScopeState } from "../data/seed.ts"

export interface ZapierEvent {
  id: string
  event: "lead.created" | "visit.booked" | "proposal.opened" | "proposal.accepted" | "job.scheduled" | "job.completed" | "deposit.paid" | "zapier.test"
  occurredAt: string
  client: { name: string; email: string; phone: string }
  job: { id: string; title: string; address: string }
}

export function zapierTarget(value: string | undefined): string | null {
  const trimmed = value?.trim() ?? ""
  if (!trimmed || trimmed.length > 500) return null
  try {
    const url = new URL(trimmed)
    if (url.protocol !== "https:" || url.username || url.password) return null
    return url.toString()
  } catch {
    return null
  }
}

export function pendingZapierEvents(state: Pick<ScopeState, "clients" | "estimates" | "workOrders" | "estimateSettings" | "zapierDelivered">): ZapierEvent[] {
  const since = state.estimateSettings.zapierSince
  const url = zapierTarget(state.estimateSettings.zapierWebhookUrl)
  if (!since || !url) return []
  const delivered = new Set(state.zapierDelivered ?? [])
  const events: ZapierEvent[] = []
  for (const estimate of state.estimates) {
    const client = state.clients.find((item) => item.id === estimate.clientId)
    const person = {
      name: client?.name ?? "Client",
      email: client?.email ?? "",
      phone: client?.phone ?? "",
    }
    const job = { id: estimate.id, title: estimate.title, address: estimate.jobAddress }
    const push = (event: ZapierEvent) => {
      if (event.occurredAt >= since && !delivered.has(event.id)) events.push(event)
    }
    if (estimate.inboundLeadId) {
      push({ id: `lead:${estimate.id}`, event: "lead.created", occurredAt: estimate.createdAt, client: person, job })
    }
    if (estimate.estimateVisitAt) {
      push({ id: `visit:${estimate.id}:${estimate.estimateVisitAt}`, event: "visit.booked", occurredAt: estimate.estimateVisitAt, client: person, job })
    }
    for (const opened of estimate.proposalOpens ?? []) {
      push({ id: `open:${opened.id}`, event: "proposal.opened", occurredAt: opened.at, client: person, job })
    }
    if (estimate.acceptedAt) {
      push({ id: `accepted:${estimate.id}`, event: "proposal.accepted", occurredAt: estimate.acceptedAt, client: person, job })
    }
    if (estimate.depositReceipt?.paidAt) {
      push({ id: `deposit:${estimate.id}:${estimate.depositReceipt.paidAt}`, event: "deposit.paid", occurredAt: estimate.depositReceipt.paidAt, client: person, job })
    }
    const order = state.workOrders.find((item) => item.estimateId === estimate.id)
    if (order?.notifiedAt && order.scheduledStartDate && order.status !== "unscheduled") {
      const event = order.status === "complete" ? "job.completed" : "job.scheduled"
      push({ id: `${event}:${estimate.id}:${order.notifiedAt}`, event, occurredAt: order.notifiedAt, client: person, job })
    }
  }
  return events.slice(0, 20)
}
