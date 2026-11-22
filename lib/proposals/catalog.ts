import type { Client, ClientStatus, Estimate } from "../types.ts"

export interface ProposalListing {
  id: string
  clientName: string
  clientId?: string
  clientEmail?: string
  title: string
  status: ClientStatus
  updatedAt: string
  isSigned: boolean
  signedName?: string | null
  signedAt?: string | null
  publicToken: string
}

export function isSignedProposal(estimate: Estimate): boolean {
  return Boolean(
    estimate.signature ||
    estimate.acceptedAt ||
    estimate.clientStatus === "accepted" ||
    estimate.paymentStatus === "deposit_paid" ||
    estimate.paymentStatus === "paid" ||
    estimate.versions?.some((v) => v.approved)
  )
}

export function listProposals(
  estimates: Estimate[],
  clients: Client[] = [],
  options?: { includeDrafts?: boolean },
): ProposalListing[] {
  return estimates
    .filter(
      (estimate) =>
        options?.includeDrafts ||
        estimate.clientStatus === "sent" ||
        estimate.clientStatus === "accepted" ||
        estimate.clientStatus === "declined" ||
        isSignedProposal(estimate),
    )
    .map((estimate) => {
      const signed = isSignedProposal(estimate)
      const effectiveStatus: ClientStatus = signed ? "accepted" : estimate.clientStatus
      const signedName = estimate.signature?.signedName || null
      const signedAt = estimate.signature?.signedAt || estimate.acceptedAt || null
      const client = clients?.find((c) => c.id === estimate.clientId)
      return {
        id: estimate.id,
        clientName: client?.name ?? "Client",
        clientId: estimate.clientId,
        clientEmail: client?.email ?? "",
        title: estimate.title || "Estimate",
        status: effectiveStatus,
        updatedAt: estimate.updatedAt,
        isSigned: signed,
        signedName,
        signedAt,
        publicToken: estimate.publicToken,
      }
    })
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
}
