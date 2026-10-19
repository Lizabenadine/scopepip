import type { Metadata } from "next"
import { PipelineView } from "@/components/pipeline/pipeline-view"

export const metadata: Metadata = {
  title: "Dashboard",
  description: "Painting jobs moving from lead to paid.",
}

export default function HomePage() {
  return <PipelineView />
}
