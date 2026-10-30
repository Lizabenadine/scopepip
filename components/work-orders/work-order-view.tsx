"use client"

import Link from "next/link"
import { ChevronLeft } from "lucide-react"
import { CompanyMark } from "@/components/brand/company-mark"
import { FieldLanguageSwitch } from "@/components/field/language-switch"
import { CompletionChecklist } from "@/components/work-orders/completion-checklist"
import { OnSiteChangeOrder } from "@/components/work-orders/on-site-change-order"
import { PendingSign } from "@/components/work-orders/pending-sign"
import { SubcontractorWorkOrder } from "@/components/work-orders/subcontractor-work-order"
import { CompanyCamSync } from "@/components/work-orders/companycam-sync"
import { ModernWorkOrder } from "@/components/work-orders/modern-work-order"
import { PhotoCapture } from "@/components/photos/photo-capture"
import { displayCompanyName } from "@/lib/brand/company"
import { useScope } from "@/lib/data/store"
import { useFieldLanguage } from "@/hooks/use-field-language"
import { officeLabel } from "@/lib/office/dashboard-copy"
import { useWorkOrders } from "@/hooks/use-work-orders"
import type { WorkOrder } from "@/lib/types"

export function WorkOrderView({ id }: { id: string }) {
  const crew = useWorkOrders(id)
  const { estimateSettings, session } = useScope()
  const { copy, language } = useFieldLanguage()
  const limited = session?.role === "project_manager"
  const hourOptions: { id: WorkOrder["hourDisplay"]; label: string }[] = [
    { id: "all", label: copy.showAllHours },
    { id: "hide-item", label: copy.hideItemHours },
    { id: "hide-all", label: copy.hideAllHours },
  ]
  const brand = displayCompanyName(estimateSettings.companyName)

  if (!crew.ready) {
    return <div className="h-40 animate-pulse rounded-2xl bg-muted" aria-hidden />
  }

  if (crew.unscheduled) {
    return (
      <div className="rounded-2xl border border-dashed border-border px-4 py-10 text-center">
        <CompanyMark name={brand} logoUrl={estimateSettings.logoUrl} className="text-sm font-semibold tracking-tight" testId="crew-brand" />
        <h1 className="mt-2 text-xl font-semibold">{copy.crewSheetWaits}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{copy.crewSheetWaitsDetail}</p>
        <Link href={limited ? "/work-orders" : `/estimates/${id}`} className="mt-4 inline-block text-sm font-medium text-primary">
          {limited ? copy.backToWorkOrders : copy.openEstimate}
        </Link>
      </div>
    )
  }

  if (crew.missing || crew.blocked || !crew.sheet) {
    return (
      <div className="rounded-2xl border border-dashed border-border px-4 py-10 text-center">
        <h1 className="text-xl font-semibold">{copy.missingOrder}</h1>
        <Link href={limited ? "/work-orders" : "/"} className="mt-4 inline-block text-sm font-medium text-primary">
          {limited ? copy.backToWorkOrders : copy.backToJobs}
        </Link>
      </div>
    )
  }

  const sheet = crew.sheet
  const orderNumber = id.replace(/^est-/i, "").replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toUpperCase()

  return (
    <article data-testid="crew-sheet" className="mx-auto flex max-w-2xl flex-col gap-6 pb-8 md:max-w-5xl">
      <div className="flex items-center justify-between gap-3">
        <Link href={limited ? "/work-orders" : "/"} className="inline-flex items-center gap-1 text-sm text-muted-foreground">
          <ChevronLeft className="size-4" />
          {limited ? copy.workOrders : copy.jobs}
        </Link>
        <div className="flex items-center gap-3">
          <Link href={`/estimates/${id}/store-list`} className="text-sm font-medium text-primary">
            {officeLabel("Store list", language)}
          </Link>
          <FieldLanguageSwitch />
          <button type="button" className="text-sm font-medium text-primary" onClick={() => window.print()}>
            Print
          </button>
        </div>
      </div>
      {crew.packet ? (
        <SubcontractorWorkOrder
          order={crew.packet}
          logoUrl={estimateSettings.logoUrl}
          description={sheet.crewNote}
          spanishDescription={sheet.crewNoteEs}
          workerName={crew.crewName}
          setDescription={crew.setPrepNotes}
          onSign={crew.signSubcontractor}
        />
      ) : null}
      {crew.crewName ? <p className="text-sm font-medium">{crew.crewName}</p> : null}
      <div className="flex flex-wrap gap-2">
        {hourOptions.map((option) => (
          <button
            key={option.id}
            type="button"
            onClick={() => crew.setHourDisplay(option.id)}
            className={
              sheet.hourDisplay === option.id
                ? "rounded-full bg-primary px-3 py-1.5 text-sm text-primary-foreground"
                : "rounded-full bg-muted px-3 py-1.5 text-sm"
            }
          >
            {option.label}
          </button>
        ))}
      </div>
      <ModernWorkOrder
        sheet={sheet}
        orderNumber={orderNumber}
        companyName={brand}
        logoUrl={estimateSettings.logoUrl}
        workerName={crew.crewName}
      />
      <PendingSign estimateId={id} />
      <OnSiteChangeOrder estimateId={id} />
      <CompletionChecklist items={sheet.checklist} onToggle={crew.toggleChecklist} />
      <CompanyCamSync estimateId={id} />
      <PhotoCapture estimateId={id} />
    </article>
  )
}
