import type { Metadata } from "next"
import { PipelineBoard } from "@/components/pipeline/pipeline-board"

export const metadata: Metadata = {
  title: "Sales Pipeline",
  description: "Cold leads through proposals. Website, Thumbtack, Angi, Google Local Services, and Facebook open a card and start the sequence.",
}

export default function SalesPipelinePage() {
  return <PipelineBoard kind="sales" />
}
