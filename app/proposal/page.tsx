import type { Metadata } from "next"
import { ProposalList } from "@/components/proposal/proposal-list"

export const metadata: Metadata = {
  title: "Proposals",
}

export default function ProposalsPage() {
  return <ProposalList />
}
