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
import { useWorkOrders } from "@/hooks/use-work-orders"
import { gallonsLabel, hoursLabel, jobDate } from "@/lib/format"
import type { WorkOrder } from "@/lib/types"

const HOUR_OPTIONS: { id: WorkOrder["hourDisplay"]; label: string }[] = [
  { id: "all", label: "Show all hours" },
  { id: "hide-item", label: "Hide item hours" },
  { id: "hide-all", label: "Hide all hours" },
]

function signedWhen(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ""
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date)
}

export function WorkOrderView({ id }: { id: string }) {
  const crew = useWorkOrders(id)
  const { estimateSettings, session } = useScope()
  const limited = session?.role === "project_manager"
  const brand = displayCompanyName(estimateSettings.companyName)

  if (!crew.ready) {
    return <div className="h-40 animate-pulse rounded-2xl bg-muted" aria-hidden />
  }

  if (crew.unscheduled) {
    return (
      <div className="rounded-2xl border border-dashed border-border px-4 py-10 text-center">
        <CompanyName name={brand} className="text-sm font-semibold tracking-tight" />
        <h1 className="mt-2 text-xl font-semibold">Crew sheet opens after this job is scheduled</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Hours, dimensions, prep notes, and paint specs come from the scheduled estimate.
        </p>
        <Link href={limited ? "/work-orders" : `/estimates/${id}`} className="mt-4 inline-block text-sm font-medium text-primary">
          {limited ? "Back to work orders" : "Open the estimate"}
        </Link>
      </div>
    )
  }

  if (crew.missing || crew.blocked || !crew.sheet) {
    return (
      <div className="rounded-2xl border border-dashed border-border px-4 py-10 text-center">
        <h1 className="text-xl font-semibold">This work order isn&apos;t on this device</h1>
        <Link href={limited ? "/work-orders" : "/"} className="mt-4 inline-block text-sm font-medium text-primary">
          {limited ? "Back to work orders" : "Back to jobs"}
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
        {limited ? "Work orders" : "Jobs"}
      </Link>
      {crew.packet ? (
        <SubcontractorWorkOrder
          order={crew.packet}
          description={sheet.crewNote}
          setDescription={crew.setPrepNotes}
          onSign={crew.signSubcontractor}
        />
      ) : null}
      <header className="rounded-2xl bg-card p-4 ring-1 ring-foreground/10">
        <p className="text-xs font-semibold tracking-[0.14em] text-muted-foreground uppercase">Crew production</p>
        {sheet.scheduledOn ? (
          <p className="mt-2 text-sm font-medium">
            {crew.onSite ? "On site now" : "On site"} {jobDate(sheet.scheduledOn)}
            {crew.crewName ? ` · ${crew.crewName}` : ""}
          </p>
        ) : crew.crewName ? (
          <p className="mt-2 text-sm font-medium">{crew.crewName}</p>
        ) : null}
        {showTotal ? (
          <div className="mt-3">
            <p className="text-xs font-semibold tracking-[0.14em] text-muted-foreground uppercase">
              Target labor hours
            </p>
            <p className="font-display text-4xl leading-none tabular-nums">{hoursLabel(sheet.allocatedHours)}</p>
          </div>
        ) : null}
      </header>
      <div className="flex flex-wrap gap-2">
        {HOUR_OPTIONS.map((option) => (
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
                  {area.groupName}
                </h2>
              ) : null}
              <section className="rounded-2xl bg-card p-4 ring-1 ring-foreground/10">
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="text-lg font-semibold">{area.name}</h2>
              {showItems ? (
                <p className="tabular-nums">{hoursLabel(area.allocatedHours)}</p>
              ) : null}
            </div>
            <p className="text-xs text-muted-foreground">{area.dimensionLabel}</p>
            {area.prepNote ? (
              <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-sm">{area.prepNote}</p>
            ) : null}
            <ul className="mt-3 flex flex-col gap-3">
              {area.surfaces.map((surface) => (
                <li key={surface.id}>
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="font-medium">{surface.internalLabel}</p>
                    {showItems ? (
                      <p className="text-sm tabular-nums">{hoursLabel(surface.allocatedHours)}</p>
                    ) : null}
                  </div>
                  <p className="text-sm text-muted-foreground">{surface.quantityLabel}</p>
                  {surface.productName === "Prep" ? null : (
                    <p className="text-sm">
                      <span className="text-muted-foreground">Paint spec · </span>
                      {surface.productName}
                      {surface.primerCoats > 0 ? `, ${surface.primerCoats} primer` : ""}
                      {surface.finishCoats > 0 ? `, ${surface.finishCoats} finish` : ""}
                      {surface.paintGallons > 0 ? `, ${gallonsLabel(surface.paintGallons)}` : ""}
                    </p>
                  )}
                  {surface.crewNote ? (
                    <p className="mt-1 rounded-lg bg-amber-50 px-3 py-2 text-sm">{surface.crewNote}</p>
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
            Line items
          </h2>
          {sheet.lineItems.map((line) => (
            <div key={line.id} className="rounded-2xl bg-card px-4 py-3 ring-1 ring-foreground/10">
              <div className="flex justify-between gap-3">
                <p className="font-medium">{line.label}</p>
                {showItems ? <p className="tabular-nums">{hoursLabel(line.allocatedHours)}</p> : null}
              </div>
              {line.crewNote ? (
                <p className="mt-1 rounded-lg bg-amber-50 px-3 py-2 text-sm">{line.crewNote}</p>
              ) : null}
            </div>
          ))}
        </section>
      ) : null}
      {sheet.pendingWork.length > 0 ? (
        <section className="flex flex-col gap-2" data-testid="pending-work-list">
          <h2 className="text-xs font-semibold tracking-[0.14em] text-muted-foreground uppercase">
            Pending additional work
          </h2>
          {sheet.pendingWork.map((line) => (
            <div key={line.id} className="rounded-2xl bg-card px-4 py-3 ring-1 ring-foreground/10">
              <div className="flex justify-between gap-3">
                <p className="font-medium">{line.label}</p>
                {showItems ? <p className="tabular-nums">{hoursLabel(line.allocatedHours)}</p> : null}
              </div>
              {line.crewNote ? <p className="mt-1 rounded-lg bg-amber-50 px-3 py-2 text-sm">{line.crewNote}</p> : null}
            </div>
          ))}
        </section>
      ) : null}
      {sheet.changeOrders.length > 0 ? (
        <section className="flex flex-col gap-2" data-testid="change-order-list">
          <h2 className="text-xs font-semibold tracking-[0.14em] text-muted-foreground uppercase">
            Approved on-site change orders
          </h2>
          {sheet.changeOrders.map((order) => (
            <div key={order.id} className="rounded-2xl bg-card px-4 py-3 ring-1 ring-foreground/10">
              <p className="font-medium">{order.description}</p>
              <p className="text-sm text-muted-foreground">Signed {signedWhen(order.signedAt)}</p>
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
