import type { Metadata } from "next"
import { Suspense } from "react"
import { SalesPipelineBoard } from "@/components/pipeline/sales-pipeline-board"

export const metadata: Metadata = {
  title: "Sales Pipeline",
  description: "New lead through a sent proposal. Move each job one step at a time.",
}

export default function SalesPipelinePage() {
  return (
    <Suspense fallback={<div className="h-64 animate-pulse rounded-2xl bg-muted" aria-hidden />}>
      <SalesPipelineBoard />
    </Suspense>
  )
}
