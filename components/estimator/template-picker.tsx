"use client"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  ESTIMATE_KIND_LABEL,
  areaFromTemplate,
  areaTemplatesFor,
  areasFromEstimateTemplate,
  estimateTemplateById,
  estimateTemplatesFor,
  type EstimateKind,
} from "@/lib/estimate/templates"
import type { AreaInput } from "@/lib/types"

export function TemplatePicker({
  open,
  onOpenChange,
  onAdd,
  kind,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onAdd: (areas: AreaInput[], title?: string) => void
  kind: EstimateKind
}) {
  const jobs = estimateTemplatesFor(kind)
  const areas = areaTemplatesFor(kind)

  const addJob = (templateId: string) => {
    const next = areasFromEstimateTemplate(templateId)
    if (next.length === 0) return
    onAdd(next, estimateTemplateById(templateId)?.title)
    onOpenChange(false)
  }

  const addArea = (templateId: string) => {
    const area = areaFromTemplate(templateId)
    if (!area) return
    onAdd([area])
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[min(40rem,85vh)] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{ESTIMATE_KIND_LABEL[kind]} templates</DialogTitle>
          <DialogDescription>
            Start from a whole {ESTIMATE_KIND_LABEL[kind].toLowerCase()} job, or add one area. Sizes are a starting point. Change length, width, and height after it lands on the estimate.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-2">
          <h3 className="text-xs font-semibold tracking-[0.14em] text-muted-foreground uppercase">Whole job</h3>
          {jobs.map((template) => (
            <button
              key={template.id}
              type="button"
              data-testid={`template-${template.id}`}
              onClick={() => addJob(template.id)}
              className="rounded-2xl bg-card px-3 py-3 text-left ring-1 ring-foreground/10"
            >
              <span className="block text-sm font-medium">{template.name}</span>
              <span className="mt-1 block text-xs text-muted-foreground">{template.summary}</span>
            </button>
          ))}
        </div>
        <div className="grid gap-2">
          <h3 className="text-xs font-semibold tracking-[0.14em] text-muted-foreground uppercase">One area</h3>
          <div className="grid gap-2 sm:grid-cols-2">
            {areas.map((template) => (
              <button
                key={template.id}
                type="button"
                data-testid={template.id === "bedroom" ? "add-bedroom" : `template-${template.id}`}
                onClick={() => addArea(template.id)}
                className="rounded-2xl bg-card px-3 py-3 text-left ring-1 ring-foreground/10"
              >
                <span className="block text-sm font-medium">{template.name}</span>
                <span className="mt-1 block text-xs text-muted-foreground">{template.summary}</span>
              </button>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
