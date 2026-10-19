import type { ScopeState } from "../data/seed.ts"
import type { Client, Estimate } from "../types.ts"

export interface PastCustomer {
  client: Client
  estimate: Estimate
  email: string
  address: string
}

export function pastCustomers(state: Pick<ScopeState, "clients" | "estimates" | "workOrders" | "stages">): PastCustomer[] {
  const rows: PastCustomer[] = []
  const seen = new Set<string>()
  for (const estimate of state.estimates) {
    if (seen.has(estimate.clientId) || !isFinished(state, estimate)) continue
    const client = state.clients.find((item) => item.id === estimate.clientId)
    const email = client?.email.trim() ?? ""
    if (!client || !email.includes("@")) continue
    seen.add(client.id)
    rows.push({
      client,
      estimate,
      email,
      address: estimate.jobAddress || client.address,
    })
  }
  return rows.sort((left, right) => left.client.name.localeCompare(right.client.name))
}

export function pastCustomerEmail(input: { clientName: string; company: string; address: string }): { subject: string; body: string } {
  const company = input.company.trim() || "ScopePipe"
  const address = input.address.trim() || "your property"
  return {
    subject: `Another room to paint?`,
    body: `Hi ${input.clientName.trim() || "there"}, this is ${company}. The work at ${address} is finished. Reply if you want another room painted.`,
  }
}

function isFinished(state: Pick<ScopeState, "workOrders" | "stages">, estimate: Estimate): boolean {
  const order = state.workOrders.find((item) => item.estimateId === estimate.id)
  if (order?.status === "complete") return true
  const stage = state.stages.find((item) => item.id === estimate.stageId)
  return stage?.slug === "completed"
}
