import type { Metadata } from "next"
import { ProposalTracker } from "@/components/proposal/proposal-tracker"
import { PublicProposal } from "@/components/proposal/public-proposal"

export const metadata: Metadata = {
  title: "Proposal",
}

export default async function PublicProposalPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  return (
    <>
      <ProposalTracker proposalId={token} />
      <PublicProposal token={token} />
    </>
  )
}
