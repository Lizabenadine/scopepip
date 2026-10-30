import type { Metadata } from "next"
import { PipelineBoard } from "@/components/pipeline/pipeline-board"

export const metadata: Metadata = {
  title: "Sales Pipeline",
  description: "New lead through a sent proposal. Move each job one step at a time.",
}

export default function SalesPipelinePage() {
  return <PipelineBoard kind="sales" />
}
