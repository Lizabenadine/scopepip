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
    <div className="rounded-xl border border-slate-800 bg-slate-950 p-5 text-slate-100 shadow-2xl md:p-8 print:border-slate-300 print:bg-white print:text-slate-900 print:shadow-none">
      <div className="flex items-start justify-between gap-4 border-b border-slate-800 pb-6 print:border-slate-200">
        <div>
          <CompanyMark
            name={companyName}
            logoUrl={logoUrl}
            className="text-2xl font-bold tracking-tight text-white print:text-slate-950"
            imageClassName="h-9"
            testId="crew-brand"
          />
          <p className="mt-1 text-xs text-slate-400 print:text-slate-500">{copy.crewProduction}</p>
        </div>
        <div className="text-right">
          <span className="rounded-full border border-cyan-500/20 bg-cyan-500/10 px-3 py-1 text-xs font-semibold tracking-wider text-cyan-400 uppercase">
            {spanish ? "Orden de Trabajo" : "Work Order"}
          </span>
          <p className="mt-2 text-sm font-semibold text-slate-200 print:text-slate-800">#{orderNumber}</p>
          {sheet.scheduledOn ? <p className="text-xs text-slate-400 print:text-slate-500">{copy.jobDate(sheet.scheduledOn)}</p> : null}
          {workerName ? (
            <p className="text-xs text-slate-300 print:text-slate-700">
              {copy.crewLead}: {workerName}
            </p>
          ) : null}
        </div>
      </div>

      <div className="my-6 flex items-center justify-between gap-4 rounded-lg border border-slate-800 bg-slate-900/80 p-4 print:border-slate-200 print:bg-slate-50">
        <div>
          <h3 className="text-xs font-semibold tracking-wider text-slate-400 uppercase print:text-slate-500">
            {spanish ? "Dirección del Trabajo" : "Jobsite Address"}
          </h3>
          <p className="text-sm font-medium text-white print:text-slate-950">{sheet.clientName}</p>
          {address ? <p className="text-sm text-slate-300 print:text-slate-700">{address}</p> : null}
          {showTotal ? (
            <p className="mt-2 text-xs text-slate-400 print:text-slate-500">
              {copy.targetHours}: {copy.hours(sheet.allocatedHours)}
            </p>
          ) : null}
        </div>
        {mapsUrl ? (
          <a
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            data-testid="navigate-jobsite"
            className="flex items-center gap-2 rounded-lg bg-cyan-500 px-4 py-2 text-xs font-bold text-slate-950 hover:bg-cyan-400"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            {spanish ? "Navegar" : "Navigate"}
          </a>
        ) : null}
      </div>

      <div className="space-y-6">
        {sheet.areas.map((area, index) => {
          const showGroup = Boolean(area.groupName) && sheet.areas[index - 1]?.groupName !== area.groupName
          return (
            <div key={area.id}>
              {showGroup ? (
                <h2 className="mb-3 text-xs font-semibold tracking-wider text-slate-400 uppercase" data-testid="crew-group">
                  {say(area.groupName ?? "")}
                </h2>
              ) : null}
              <section className="space-y-4 rounded-xl border border-slate-800 bg-slate-900 p-5 print:border-slate-200 print:bg-white">
                <div className="flex items-center justify-between gap-3 border-b border-slate-800/60 pb-3 print:border-slate-200">
                  <h4 className="text-base font-bold text-cyan-400">{say(area.name)}</h4>
                  {showItems ? (
                    <span className="rounded-md bg-slate-800 px-2.5 py-1 text-xs text-slate-300 print:bg-slate-100 print:text-slate-700">
                      {copy.hours(area.allocatedHours)}
                    </span>
                  ) : null}
                </div>
                <p className="text-xs text-slate-400 print:text-slate-500">{say(area.dimensionLabel)}</p>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  {area.surfaces.map((surface) => (
                    <div key={surface.id} className="rounded-lg border border-slate-800/50 bg-slate-950/60 p-3 print:border-slate-200 print:bg-slate-50">
                      <div className="mb-1 flex justify-between gap-3 text-xs text-slate-400 print:text-slate-500">
                        <span>{say(surface.internalLabel)}</span>
                        <span className="font-semibold text-cyan-400">
                          {[
                            surface.primerCoats > 0 ? copy.primer(surface.primerCoats) : "",
                            surface.finishCoats > 0 ? copy.finish(surface.finishCoats) : "",
                          ]
                            .filter(Boolean)
                            .join(" · ")}
                        </span>
                      </div>
                      <p className="text-sm text-slate-300 print:text-slate-600">{say(surface.quantityLabel)}</p>
                      {surface.productName === "Prep" ? null : (
                        <p className="text-sm font-semibold text-white print:text-slate-950">
                          {say(surface.productName)}
                          {surface.paintGallons > 0 ? ` · ${copy.gallons(surface.paintGallons)}` : ""}
                        </p>
                      )}
                      {surface.crewNote ? (
                        <p className="mt-1 text-xs text-slate-400 print:text-slate-600">{paintingText(surface.crewNote, undefined, language)}</p>
                      ) : null}
                    </div>
                  ))}
                </div>
                {area.prepNote ? (
                  <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 text-xs text-amber-200/90 print:border-amber-300 print:bg-amber-50 print:text-amber-950">
                    <span className="mb-1 block font-bold tracking-wider text-amber-400 uppercase print:text-amber-800">
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
          <h2 className="text-xs font-semibold tracking-wider text-slate-400 uppercase">{copy.lineItems}</h2>
          {sheet.lineItems.map((line) => (
            <div key={line.id} className="rounded-xl border border-slate-800 bg-slate-900 p-4 print:border-slate-200 print:bg-white">
              <div className="flex justify-between gap-3">
                <p className="font-medium text-white print:text-slate-950">{paintingText(line.label, line.labelEs, language)}</p>
                {showItems ? <p className="text-xs text-slate-300">{copy.hours(line.allocatedHours)}</p> : null}
              </div>
              {line.crewNote ? (
                <p className="mt-2 text-xs text-amber-200/90">{paintingText(line.crewNote, line.crewNoteEs, language)}</p>
              ) : null}
            </div>
          ))}
        </section>
      ) : null}

      {sheet.pendingWork.length > 0 ? (
        <section className="mt-6 space-y-3" data-testid="pending-work-list">
          <h2 className="text-xs font-semibold tracking-wider text-slate-400 uppercase">{copy.pendingWork}</h2>
          {sheet.pendingWork.map((line) => (
            <div key={line.id} className="rounded-xl border border-slate-800 bg-slate-900 p-4 print:border-slate-200 print:bg-white">
              <div className="flex justify-between gap-3">
                <p className="font-medium text-white print:text-slate-950">{paintingText(line.label, line.labelEs, language)}</p>
                {showItems ? <p className="text-xs text-slate-300">{copy.hours(line.allocatedHours)}</p> : null}
              </div>
              {line.crewNote ? <p className="mt-2 text-xs text-amber-200/90">{paintingText(line.crewNote, line.crewNoteEs, language)}</p> : null}
            </div>
          ))}
        </section>
      ) : null}

      {sheet.changeOrders.length > 0 ? (
        <section className="mt-6 space-y-3" data-testid="change-order-list">
          <h2 className="text-xs font-semibold tracking-wider text-slate-400 uppercase">{copy.approvedChanges}</h2>
          {sheet.changeOrders.map((order) => (
            <div key={order.id} className="rounded-xl border border-slate-800 bg-slate-900 p-4 print:border-slate-200 print:bg-white">
              <p className="font-medium text-white print:text-slate-950">{say(order.description)}</p>
              <p className="text-sm text-slate-400">
                {copy.signed} {copy.signedWhen(order.signedAt)}
              </p>
            </div>
          ))}
        </section>
      ) : null}
    </div>
  )
}
