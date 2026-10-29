"use client"

import { Button } from "@/components/ui/button"
import { useFieldLanguage } from "@/hooks/use-field-language"
import { useScope } from "@/lib/data/store"
import { officeLabel } from "@/lib/office/dashboard-copy"
import { jobsCsv } from "@/lib/pipeline/export"
import type { Estimate } from "@/lib/types"

const STATUS_LABEL = {
  draft: "Draft",
  sent: "Sent",
  accepted: "Accepted",
  declined: "Declined",
} as const

export function JobsExport({ estimates }: { estimates: Estimate[] }) {
  const scope = useScope()
  const { language } = useFieldLanguage()
  return (
    <Button
      type="button"
      variant="outline"
      className="h-11 shrink-0"
      data-testid="export-jobs"
      disabled={estimates.length === 0}
      onClick={() => {
        const csv = jobsCsv(
          estimates.map((estimate) => ({
            client: scope.clientById(estimate.clientId)?.name ?? "",
            job: estimate.title,
            address: estimate.jobAddress,
            stage: scope.stageById(estimate.stageId)?.name ?? "",
            status: STATUS_LABEL[estimate.clientStatus],
            total: scope.quoteEstimate(estimate).total,
            updated: estimate.updatedAt.slice(0, 10),
          })),
        )
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8" })
        const url = URL.createObjectURL(blob)
        const link = document.createElement("a")
        link.href = url
        link.download = "scopepipe-jobs.csv"
        link.click()
        URL.revokeObjectURL(url)
      }}
    >
      {officeLabel("Export", language)}
    </Button>
  )
}
