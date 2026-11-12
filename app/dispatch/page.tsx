import type { Metadata } from "next"
import { Suspense } from "react"
import { PipelineBoard } from "@/components/pipeline/pipeline-board"

export const metadata: Metadata = {
  title: "Dispatch & Map",
  description: "Accepted painting projects from award through completion.",
}

export default function DispatchPage() {
  return (
    <Suspense fallback={<div className="h-64 animate-pulse rounded-2xl bg-muted" aria-hidden />}>
      <PipelineBoard kind="jobs" />
    </Suspense>
  )
}
