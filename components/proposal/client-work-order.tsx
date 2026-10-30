"use client"

import { CompanyMark } from "@/components/brand/company-mark"
import { useFieldLanguage } from "@/hooks/use-field-language"
import type { PricedArea } from "@/lib/estimate/calculate"
import type { AreaSection } from "@/lib/estimate/groups"
import { translatePainting } from "@/lib/field/terms"
import { money } from "@/lib/format"

export function ClientWorkOrder({
  companyName,
  logoUrl,
  clientName,
  jobAddress,
  orderNumber,
  sections,
}: {
  companyName: string
  logoUrl?: string | null
  clientName: string
  jobAddress: string
  orderNumber: string
  sections: AreaSection<PricedArea>[]
}) {
  const { language } = useFieldLanguage()
  const say = (text: string) => translatePainting(text, language)
  const spanish = language === "es"
  const address = jobAddress.trim()
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
            testId="client-work-order-brand"
          />
          <p className="mt-1 text-xs text-slate-400 print:text-slate-500">
            {spanish ? "Orden de trabajo para el cliente" : "Work order for the client"}
          </p>
        </div>
        <div className="text-right">
          <span className="rounded-full border border-cyan-500/20 bg-cyan-500/10 px-3 py-1 text-xs font-semibold tracking-wider text-cyan-400 uppercase">
            {spanish ? "Orden de Trabajo" : "Work Order"}
          </span>
          <p className="mt-2 text-sm font-semibold text-slate-200 print:text-slate-800">#{orderNumber}</p>
        </div>
      </div>

      <div className="my-6 flex items-center justify-between gap-4 rounded-lg border border-slate-800 bg-slate-900/80 p-4 print:border-slate-200 print:bg-slate-50">
        <div>
          <h3 className="text-xs font-semibold tracking-wider text-slate-400 uppercase print:text-slate-500">
            {spanish ? "Dirección del Trabajo" : "Jobsite Address"}
          </h3>
          <p className="text-sm font-medium text-white print:text-slate-950">{clientName}</p>
          {address ? <p className="text-sm text-slate-300 print:text-slate-700">{address}</p> : null}
        </div>
        {mapsUrl ? (
          <a
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
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
        {sections.map((section) => (
          <div key={section.groupId ?? "ungrouped"} className="space-y-4">
            {section.groupName ? (
              <h2 className="text-xs font-semibold tracking-wider text-slate-400 uppercase" data-testid="proposal-group">
                {say(section.groupName)}
              </h2>
            ) : null}
            {section.items.map((area) => {
              const surfaces = area.surfaces.filter((surface) => !surface.hideFromCustomer)
              const size =
                area.areaType === "room"
                  ? `${area.lengthFt} × ${area.widthFt} × ${area.heightFt} ft`
                  : `${area.lengthFt} × ${area.heightFt} ft`
              const prep = [area.prepLevel !== "none" ? `${area.prepLevel} prep` : "", area.crewNote.trim()]
                .filter(Boolean)
                .join(". ")
              return (
                <section key={area.id} className="space-y-4 rounded-xl border border-slate-800 bg-slate-900 p-5 print:border-slate-200 print:bg-white">
                  <div className="flex items-center justify-between gap-3 border-b border-slate-800/60 pb-3 print:border-slate-200">
                    <h4 className="text-base font-bold text-cyan-400">{say(area.name)}</h4>
                    <span className="text-sm font-semibold text-white print:text-slate-950">{money(area.clientPrice)}</span>
                  </div>
                  <p className="text-xs text-slate-400 print:text-slate-500">{size}</p>
                  {[area.colorName, area.colorCode, area.sheen].filter(Boolean).length > 0 ? (
                    <p className="text-sm text-slate-200 print:text-slate-800" data-testid="room-color">
                      {[area.colorName, area.colorCode, area.sheen].filter(Boolean).join(" · ")}
                    </p>
                  ) : null}
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    {surfaces.map((surface) => (
                      <div key={surface.id} className="rounded-lg border border-slate-800/50 bg-slate-950/60 p-3 print:border-slate-200 print:bg-slate-50">
                        <div className="mb-1 flex justify-between gap-3 text-xs text-slate-400 print:text-slate-500">
                          <span>{say(surface.clientLabel)}</span>
                          {surface.showCoats && surface.coatCount > 0 ? (
                            <span className="font-semibold text-cyan-400">{say(`${surface.coatCount} coats`)}</span>
                          ) : null}
                        </div>
                        {surface.productName === "Prep" ? null : (
                          <p className="text-sm font-semibold text-white print:text-slate-950">{say(surface.productName)}</p>
                        )}
                        {surface.clientDescription ? (
                          <p className="mt-1 text-xs text-slate-400 print:text-slate-600">{say(surface.clientDescription)}</p>
                        ) : null}
                        {surface.showPrice ? (
                          <p className="mt-2 text-xs font-semibold text-slate-200 print:text-slate-800">{money(surface.price)}</p>
                        ) : null}
                      </div>
                    ))}
                  </div>
                  {prep ? (
                    <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 text-xs text-amber-200/90 print:border-amber-300 print:bg-amber-50 print:text-amber-950">
                      <span className="mb-1 block font-bold tracking-wider text-amber-400 uppercase print:text-amber-800">
                        {spanish ? "Instrucciones de Preparación" : "Prep Instructions"}
                      </span>
                      {say(prep)}
                    </div>
                  ) : null}
                </section>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}
