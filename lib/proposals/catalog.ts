import type { Client, ClientStatus, Estimate } from "../types.ts"

export interface ProposalListing {
  id: string
  clientName: string
  title: string
  status: ClientStatus
  updatedAt: string
}

export function listProposals(estimates: Estimate[], clients: Client[]): ProposalListing[] {
  return estimates
    .filter(
      (estimate) =>
        estimate.clientStatus === "sent" ||
        estimate.clientStatus === "accepted" ||
        estimate.clientStatus === "declined",
    )
    .map((estimate) => ({
      id: estimate.id,
      clientName: clients.find((client) => client.id === estimate.clientId)?.name ?? "Client",
      title: estimate.title || "Estimate",
      status: estimate.clientStatus,
      updatedAt: estimate.updatedAt,
    }))
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
}
