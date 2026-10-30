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
  ESTIMATE_KINDS,
  areaFromTemplate,
  areaTemplatesFor,
  areasFromEstimateTemplate,
  estimateTemplateById,
  estimateTemplatesFor,
  type EstimateKind,
} from "@/lib/estimate/templates"
import { applySavedTemplate, savedTemplateSummary, type SavedEstimateTemplate } from "@/lib/estimate/saved-templates"
import type { AreaGroup, AreaInput, LineItemInput } from "@/lib/types"

export function TemplatePicker({
  open,
  onOpenChange,
  onAdd,
  savedTemplates,
  onDeleteSaved,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onAdd: (
    areas: AreaInput[],
    title: string | undefined,
    lineItems: LineItemInput[] | undefined,
    areaGroups: AreaGroup[] | undefined,
    kind: EstimateKind,
  ) => void
  savedTemplates: SavedEstimateTemplate[]
  onDeleteSaved: (id: string) => void
}) {
  const addJob = (templateId: string, kind: EstimateKind) => {
    const next = areasFromEstimateTemplate(templateId)
    if (next.length === 0) return
    onAdd(next, estimateTemplateById(templateId)?.title, undefined, undefined, kind)
    onOpenChange(false)
  }

  const addArea = (templateId: string, kind: EstimateKind) => {
    const area = areaFromTemplate(templateId)
    if (!area) return
    onAdd([area], undefined, undefined, undefined, kind)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[min(40rem,85vh)] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Templates</DialogTitle>
          <DialogDescription>
            Interior and exterior jobs are both here. Choosing one sets the estimate to that type. A template you saved uses your current production rates.
          </DialogDescription>
        </DialogHeader>
        {ESTIMATE_KINDS.map((kind) => {
          const jobs = estimateTemplatesFor(kind)
          const areas = areaTemplatesFor(kind)
          const saved = savedTemplates.filter((template) => template.kind === kind)
          return (
            <section key={kind} className="grid gap-3" data-testid={`templates-${kind}`}>
              <h2 className="text-sm font-semibold">{ESTIMATE_KIND_LABEL[kind]}</h2>
              {saved.length > 0 ? (
                <div className="grid gap-2">
                  <h3 className="text-xs font-semibold tracking-[0.14em] text-muted-foreground uppercase">Your templates</h3>
                  {saved.map((template) => (
                    <div key={template.id} className="flex items-stretch gap-2">
                      <button
                        type="button"
                        data-testid={`saved-template-${template.id}`}
                        onClick={() => {
                          const applied = applySavedTemplate(template)
                          onAdd(applied.areas, applied.title, applied.lineItems, applied.areaGroups, kind)
                          onOpenChange(false)
                        }}
                        className="min-w-0 flex-1 rounded-2xl border border-slate-200 bg-white px-3 py-3 text-left shadow-sm"
                      >
                        <span className="block text-sm font-medium">{template.name}</span>
                        <span className="mt-1 block text-xs text-muted-foreground">{savedTemplateSummary(template)}</span>
                      </button>
                      <button
                        type="button"
                        className="px-2 text-sm text-muted-foreground"
                        data-testid={`delete-template-${template.id}`}
                        onClick={() => onDeleteSaved(template.id)}
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              ) : null}
              <div className="grid gap-2">
                <h3 className="text-xs font-semibold tracking-[0.14em] text-muted-foreground uppercase">Whole job</h3>
                {jobs.map((template) => (
                  <button
                    key={template.id}
                    type="button"
                    data-testid={`template-${template.id}`}
                    onClick={() => addJob(template.id, kind)}
                    className="rounded-2xl border border-slate-200 bg-white px-3 py-3 text-left shadow-sm"
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
                      onClick={() => addArea(template.id, kind)}
                      className="rounded-2xl border border-slate-200 bg-white px-3 py-3 text-left shadow-sm"
                    >
                      <span className="block text-sm font-medium">{template.name}</span>
                      <span className="mt-1 block text-xs text-muted-foreground">{template.summary}</span>
                    </button>
                  ))}
                </div>
              </div>
            </section>
          )
        })}
      </DialogContent>
    </Dialog>
  )
}
