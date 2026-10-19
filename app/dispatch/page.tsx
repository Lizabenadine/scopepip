import type { Metadata } from "next"
import { PipelineBoard } from "@/components/pipeline/pipeline-board"

export const metadata: Metadata = {
  title: "Dispatch & Map",
  description: "Accepted painting projects from award through completion.",
}

export default function DispatchPage() {
  return <PipelineBoard kind="jobs" />
}
