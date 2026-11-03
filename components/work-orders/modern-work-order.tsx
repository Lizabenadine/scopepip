"use client"

import { CompanyMark } from "@/components/brand/company-mark"
import { useFieldLanguage } from "@/hooks/use-field-language"
import { paintingText, translatePainting } from "@/lib/field/terms"
import type { CrewSheet } from "@/lib/work-orders/crew-sheet"

export function ModernWorkOrder({
  sheet,
  orderNumber,
  companyName,
  logoUrl,
  workerName,
}: {
  sheet: CrewSheet
  orderNumber: string
  companyName: string
  logoUrl?: string | null
  workerName?: string | null
}) {
  const { copy, language } = useFieldLanguage()
  const say = (text: string) => translatePainting(text, language)
  const spanish = language === "es"
  const showTotal = sheet.hourDisplay !== "hide-all"
  const showItems = sheet.hourDisplay === "all"
  const address = sheet.address.trim()
  const mapsUrl = address
    ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}&dir_action=navigate`
    : ""

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white text-slate-900 shadow-sm print:shadow-none">
      <header className="bg-[#02182F] px-5 py-5 text-white print:bg-white print:text-slate-950 md:px-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <CompanyMark
              name={companyName}
              logoUrl={logoUrl}
              className="text-xl font-bold tracking-tight text-white print:text-slate-950"
              imageClassName="h-9"
              testId="crew-brand"
            />
            <p className="mt-1 text-xs text-cyan-200 print:text-slate-500">{copy.crewProduction}</p>
          </div>
          <div className="text-left sm:text-right">
            <span className="rounded-full border border-cyan-300/40 bg-cyan-400/10 px-3 py-1 text-xs font-semibold tracking-wider text-[#05C9FF] uppercase print:border-slate-300 print:text-slate-700">
              {spanish ? "Orden de Trabajo" : "Work Order"}
            </span>
            <p className="mt-2 font-mono text-sm font-semibold">#{orderNumber}</p>
          </div>
        </div>
        <h2 className="mt-4 text-2xl font-semibold tracking-tight">{sheet.title}</h2>
        <dl className="mt-4 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
          <Fact label={spanish ? "Cliente" : "Customer"} value={sheet.clientName} />
          <Fact label={spanish ? "Dirección" : "Jobsite"} value={address || (spanish ? "Sin dirección" : "No address yet")} />
          <Fact label={copy.crewLead} value={workerName || (spanish ? "Sin asignar" : "Unassigned")} />
          <Fact label={spanish ? "Fecha" : "Scheduled"} value={sheet.scheduledOn ? copy.jobDate(sheet.scheduledOn) : (spanish ? "Sin fecha" : "Not scheduled")} />
        </dl>
      </header>

      <div className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between md:px-8">
        {showTotal ? (
          <p className="text-sm font-semibold text-slate-800">
            {copy.targetHours}: <span className="text-[#004789]">{copy.hours(sheet.allocatedHours)}</span>
          </p>
        ) : <span />}
        {mapsUrl ? (
          <a
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            data-testid="navigate-jobsite"
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#05C9FF] px-5 text-sm font-semibold text-[#02182F]"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            {spanish ? "Navegar" : "Navigate"}
          </a>
        ) : null}
      </div>
      <div className="space-y-6 px-5 pb-5 md:px-8 md:pb-8">

      <div className="space-y-6">
        {sheet.areas.map((area, index) => {
          const showGroup = Boolean(area.groupName) && sheet.areas[index - 1]?.groupName !== area.groupName
          return (
            <div key={area.id}>
              {showGroup ? (
                <h2 className="mb-3 text-xs font-semibold tracking-wider text-slate-500 uppercase" data-testid="crew-group">
                  {say(area.groupName ?? "")}
                </h2>
              ) : null}
              <section className="space-y-4 rounded-xl border border-slate-200 bg-slate-50 p-5 break-inside-avoid">
                <div className="flex items-center justify-between gap-3 border-b border-slate-200 pb-3">
                  <h4 className="text-lg font-semibold text-[#02182F]">{say(area.name)}</h4>
                  {showItems ? (
                    <span className="rounded-full bg-[#02182F] px-3 py-1 text-xs font-semibold text-[#05C9FF]">
                      {copy.hours(area.allocatedHours)}
                    </span>
                  ) : null}
                </div>
                <p className="text-xs text-slate-500">{say(area.dimensionLabel)}</p>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  {area.surfaces.map((surface) => (
                    <div key={surface.id} className="rounded-lg border border-slate-200 bg-white p-3">
                      <div className="mb-1 flex justify-between gap-3 text-xs text-slate-500">
                        <span>{say(surface.internalLabel)}</span>
                        <span className="font-semibold text-cyan-700">
                          {[
                            surface.primerCoats > 0 ? copy.primer(surface.primerCoats) : "",
                            surface.finishCoats > 0 ? copy.finish(surface.finishCoats) : "",
                          ]
                            .filter(Boolean)
                            .join(" · ")}
                        </span>
                      </div>
                      <p className="text-sm text-slate-600">{say(surface.quantityLabel)}</p>
                      {surface.productName === "Prep" ? null : (
                        <p className="text-sm font-semibold text-slate-950">
                          {say(surface.productName)}
                          {surface.paintGallons > 0 ? ` · ${copy.gallons(surface.paintGallons)}` : ""}
                        </p>
                      )}
                      {surface.crewNote ? (
                        <p className="mt-1 text-xs text-slate-600">{paintingText(surface.crewNote, undefined, language)}</p>
                      ) : null}
                    </div>
                  ))}
                </div>
                {area.prepNote ? (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-950">
                    <span className="mb-1 block font-bold tracking-wider text-amber-800 uppercase">
                      {spanish ? "Instrucciones de Preparación" : "Prep Instructions"}
                    </span>
                    {say(area.prepNote)}
                  </div>
                ) : null}
              </section>
            </div>
          )
        })}
      </div>

      {sheet.lineItems.length > 0 ? (
        <section className="mt-6 space-y-3">
          <h2 className="text-xs font-semibold tracking-wider text-slate-500 uppercase">{copy.lineItems}</h2>
          {sheet.lineItems.map((line) => (
            <div key={line.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex justify-between gap-3">
                <p className="font-medium text-slate-950">{paintingText(line.label, line.labelEs, language)}</p>
                {showItems ? <p className="text-xs text-slate-700">{copy.hours(line.allocatedHours)}</p> : null}
              </div>
              {line.crewNote ? (
                <p className="mt-2 text-xs text-amber-800">{paintingText(line.crewNote, line.crewNoteEs, language)}</p>
              ) : null}
            </div>
          ))}
        </section>
      ) : null}

      {sheet.pendingWork.length > 0 ? (
        <section className="mt-6 space-y-3" data-testid="pending-work-list">
          <h2 className="text-xs font-semibold tracking-wider text-slate-500 uppercase">{copy.pendingWork}</h2>
          {sheet.pendingWork.map((line) => (
            <div key={line.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex justify-between gap-3">
                <p className="font-medium text-slate-950">{paintingText(line.label, line.labelEs, language)}</p>
                {showItems ? <p className="text-xs text-slate-700">{copy.hours(line.allocatedHours)}</p> : null}
              </div>
              {line.crewNote ? <p className="mt-2 text-xs text-amber-800">{paintingText(line.crewNote, line.crewNoteEs, language)}</p> : null}
            </div>
          ))}
        </section>
      ) : null}

      {sheet.changeOrders.length > 0 ? (
        <section className="mt-6 space-y-3" data-testid="change-order-list">
          <h2 className="text-xs font-semibold tracking-wider text-slate-500 uppercase">{copy.approvedChanges}</h2>
          {sheet.changeOrders.map((order) => (
            <div key={order.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="font-medium text-slate-950">{say(order.description)}</p>
              <p className="text-sm text-slate-500">
                {copy.signed} {copy.signedWhen(order.signedAt)}
              </p>
            </div>
          ))}
        </section>
      ) : null}
      </div>
    </div>
  )
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[11px] font-semibold tracking-wider text-cyan-200 uppercase print:text-slate-500">{label}</dt>
      <dd className="mt-0.5 font-medium">{value}</dd>
    </div>
  )
}
