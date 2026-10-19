import type { Metadata } from "next"
import { ProposalView } from "@/components/proposal/proposal-view"

export const metadata: Metadata = {
  title: "Proposal",
}

export default async function ProposalPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return <ProposalView id={id} />
}
