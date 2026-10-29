import type { Metadata } from "next"
import { ProposalTracker } from "@/components/proposal/proposal-tracker"
import { PublicProposal } from "@/components/proposal/public-proposal"

export const metadata: Metadata = {
  title: "Proposal",
}

export default async function PublicProposalPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>
  searchParams: Promise<{ lang?: string }>
}) {
  const { token } = await params
  const { lang } = await searchParams
  const initialLanguage = lang === "es" ? "es" : lang === "en" ? "en" : null
  return (
    <>
      <ProposalTracker proposalId={token} />
      <PublicProposal token={token} initialLanguage={initialLanguage} />
    </>
  )
}
