"use client"

import Link from "next/link"
import { ChevronLeft } from "lucide-react"
import { CompanyName } from "@/components/brand/company-name"
import { CompletionChecklist } from "@/components/work-orders/completion-checklist"
import { OnSiteChangeOrder } from "@/components/work-orders/on-site-change-order"
import { PendingSign } from "@/components/work-orders/pending-sign"
import { SubcontractorWorkOrder } from "@/components/work-orders/subcontractor-work-order"
import { CompanyCamSync } from "@/components/work-orders/companycam-sync"
import { PhotoCapture } from "@/components/photos/photo-capture"
import { displayCompanyName } from "@/lib/brand/company"
import { useScope } from "@/lib/data/store"
import { useFieldLanguage } from "@/hooks/use-field-language"
import { translatePainting, paintingText } from "@/lib/field/terms"
import { useWorkOrders } from "@/hooks/use-work-orders"
import type { WorkOrder } from "@/lib/types"

export function WorkOrderView({ id }: { id: string }) {
  const crew = useWorkOrders(id)
  const { estimateSettings, session } = useScope()
  const { copy, language } = useFieldLanguage()
  const say = (text: string) => translatePainting(text, language)
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
        <CompanyName name={brand} className="text-sm font-semibold tracking-tight" />
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
  const showTotal = sheet.hourDisplay !== "hide-all"
  const showItems = sheet.hourDisplay === "all"

  return (
    <article data-testid="crew-sheet" className="mx-auto flex max-w-2xl flex-col gap-6 pb-8 md:max-w-5xl">
      <Link href={limited ? "/work-orders" : "/"} className="inline-flex items-center gap-1 text-sm text-muted-foreground">
        <ChevronLeft className="size-4" />
        {limited ? copy.workOrders : copy.jobs}
      </Link>
      {crew.packet ? (
        <SubcontractorWorkOrder
          order={crew.packet}
          description={sheet.crewNote}
          spanishDescription={sheet.crewNoteEs}
          setDescription={crew.setPrepNotes}
          onSign={crew.signSubcontractor}
        />
      ) : null}
      <header className="rounded-2xl bg-card p-4 border border-slate-200 bg-white shadow-sm">
        <p className="text-xs font-semibold tracking-[0.14em] text-muted-foreground uppercase">{copy.crewProduction}</p>
        {sheet.scheduledOn ? (
          <p className="mt-2 text-sm font-medium">
            {crew.onSite ? copy.onSiteNow : copy.onSite} {copy.jobDate(sheet.scheduledOn)}
            {crew.crewName ? ` · ${crew.crewName}` : ""}
          </p>
        ) : crew.crewName ? (
          <p className="mt-2 text-sm font-medium">{crew.crewName}</p>
        ) : null}
        {showTotal ? (
          <div className="mt-3">
            <p className="text-xs font-semibold tracking-[0.14em] text-muted-foreground uppercase">{copy.targetHours}</p>
            <p className="font-display text-4xl leading-none tabular-nums">{copy.hours(sheet.allocatedHours)}</p>
          </div>
        ) : null}
      </header>
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
      <div className="grid gap-4 md:grid-cols-2">
        {sheet.areas.map((area, index) => {
          const showGroup = Boolean(area.groupName) && sheet.areas[index - 1]?.groupName !== area.groupName
          return (
            <div key={area.id} className="contents">
              {showGroup ? (
                <h2
                  className="text-xs font-semibold tracking-[0.14em] text-muted-foreground uppercase md:col-span-2"
                  data-testid="crew-group"
                >
                  {say(area.groupName ?? "")}
                </h2>
              ) : null}
              <section className="rounded-2xl bg-card p-4 border border-slate-200 bg-white shadow-sm">
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="text-lg font-semibold">{say(area.name)}</h2>
              {showItems ? (
                <p className="tabular-nums">{copy.hours(area.allocatedHours)}</p>
              ) : null}
            </div>
            <p className="text-xs text-muted-foreground">{say(area.dimensionLabel)}</p>
            {area.prepNote ? (
              <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-sm">{say(area.prepNote)}</p>
            ) : null}
            <ul className="mt-3 flex flex-col gap-3">
              {area.surfaces.map((surface) => (
                <li key={surface.id}>
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="font-medium">{say(surface.internalLabel)}</p>
                    {showItems ? (
                      <p className="text-sm tabular-nums">{copy.hours(surface.allocatedHours)}</p>
                    ) : null}
                  </div>
                  <p className="text-sm text-muted-foreground">{say(surface.quantityLabel)}</p>
                  {surface.productName === "Prep" ? null : (
                    <p className="text-sm">
                      <span className="text-muted-foreground">{copy.paintSpec} · </span>
                      {say(surface.productName)}
                      {surface.primerCoats > 0 ? `, ${copy.primer(surface.primerCoats)}` : ""}
                      {surface.finishCoats > 0 ? `, ${copy.finish(surface.finishCoats)}` : ""}
                      {surface.paintGallons > 0 ? `, ${copy.gallons(surface.paintGallons)}` : ""}
                    </p>
                  )}
                  {surface.crewNote ? (
                    <p className="mt-1 rounded-lg bg-amber-50 px-3 py-2 text-sm">{paintingText(surface.crewNote, undefined, language)}</p>
                  ) : null}
                </li>
              ))}
              </ul>
            </section>
            </div>
          )
        })}
      </div>
      {sheet.lineItems.length > 0 ? (
        <section className="flex flex-col gap-2">
          <h2 className="text-xs font-semibold tracking-[0.14em] text-muted-foreground uppercase">
            {copy.lineItems}
          </h2>
          {sheet.lineItems.map((line) => (
            <div key={line.id} className="rounded-2xl bg-card px-4 py-3 border border-slate-200 bg-white shadow-sm">
              <div className="flex justify-between gap-3">
                <p className="font-medium">{paintingText(line.label, line.labelEs, language)}</p>
                {showItems ? <p className="tabular-nums">{copy.hours(line.allocatedHours)}</p> : null}
              </div>
              {line.crewNote ? (
                <p className="mt-1 rounded-lg bg-amber-50 px-3 py-2 text-sm">{paintingText(line.crewNote, line.crewNoteEs, language)}</p>
              ) : null}
            </div>
          ))}
        </section>
      ) : null}
      {sheet.pendingWork.length > 0 ? (
        <section className="flex flex-col gap-2" data-testid="pending-work-list">
          <h2 className="text-xs font-semibold tracking-[0.14em] text-muted-foreground uppercase">
            {copy.pendingWork}
          </h2>
          {sheet.pendingWork.map((line) => (
            <div key={line.id} className="rounded-2xl bg-card px-4 py-3 border border-slate-200 bg-white shadow-sm">
              <div className="flex justify-between gap-3">
                <p className="font-medium">{paintingText(line.label, line.labelEs, language)}</p>
                {showItems ? <p className="tabular-nums">{copy.hours(line.allocatedHours)}</p> : null}
              </div>
              {line.crewNote ? <p className="mt-1 rounded-lg bg-amber-50 px-3 py-2 text-sm">{paintingText(line.crewNote, line.crewNoteEs, language)}</p> : null}
            </div>
          ))}
        </section>
      ) : null}
      {sheet.changeOrders.length > 0 ? (
        <section className="flex flex-col gap-2" data-testid="change-order-list">
          <h2 className="text-xs font-semibold tracking-[0.14em] text-muted-foreground uppercase">
            {copy.approvedChanges}
          </h2>
          {sheet.changeOrders.map((order) => (
            <div key={order.id} className="rounded-2xl bg-card px-4 py-3 border border-slate-200 bg-white shadow-sm">
              <p className="font-medium">{say(order.description)}</p>
              <p className="text-sm text-muted-foreground">{copy.signed} {copy.signedWhen(order.signedAt)}</p>
            </div>
          ))}
        </section>
      ) : null}
      <PendingSign estimateId={id} />
      <OnSiteChangeOrder estimateId={id} />
      <CompletionChecklist items={sheet.checklist} onToggle={crew.toggleChecklist} />
      <CompanyCamSync estimateId={id} />
      <PhotoCapture estimateId={id} />
    </article>
  )
}
