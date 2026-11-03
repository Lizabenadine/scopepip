"use client"

import { JOB_FLOW, jobFlowIndex, type JobFlowId } from "@/lib/office/workflow"
import { officeLabel } from "@/lib/office/dashboard-copy"
import type { FieldLanguage } from "@/lib/field/language"
import { cn } from "@/lib/utils"

export function JobFlow({ step, language }: { step: JobFlowId; language: FieldLanguage }) {
  const current = jobFlowIndex(step)
  return (
    <ol data-testid="job-flow" className="flex gap-2 overflow-x-auto pb-1" aria-label={officeLabel("Job status", language)}>
      {JOB_FLOW.map((item, index) => {
        const done = index < current
        const active = index === current
        return (
          <li
            key={item.id}
            data-current={active ? "yes" : "no"}
            className={cn(
              "shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold",
              active && "bg-[#004789] text-white",
              done && "bg-[#02182F] text-[#05C9FF]",
              !active && !done && "bg-slate-100 text-slate-500",
            )}
          >
            {officeLabel(item.label, language)}
          </li>
        )
      })}
    </ol>
  )
}
