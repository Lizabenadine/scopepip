"use client"

import { CompanyMark } from "@/components/brand/company-mark"
import { useFieldLanguage } from "@/hooks/use-field-language"
import { paintingText, translatePainting } from "@/lib/field/terms"
import { useScope } from "@/lib/data/store"
import { FLOORING_MATERIAL_LABELS, REFINISH_SERVICE_LABELS, REFINISH_SERVICE_DESCRIPTIONS } from "@/lib/flooring/defaults"
import { DRYWALL_BOARD_LABELS, DRYWALL_BOARD_SIZE_SPECS, DRYWALL_FINISH_LEVEL_LABELS } from "@/lib/drywall/defaults"
import { formatFeetInches } from "@/lib/estimate/dimensions"
import { recomputeRoomGeometry } from "@/lib/flooring/calculate"
import { recomputeDrywallRoomGeometry } from "@/lib/drywall/calculate"
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
  const { estimates } = useScope()
  const estimate = estimates.find((e) => e.id === sheet.estimateId)
  const say = (text: string) => translatePainting(text, language)
  const spanish = language === "es"
  const showTotal = sheet.hourDisplay !== "hide-all"
  const showItems = sheet.hourDisplay === "all"
  const address = sheet.address.trim()
  const mapsUrl = address
    ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}&dir_action=navigate`
    : ""

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 text-slate-900 shadow-sm md:p-8 print:shadow-none">
      <div className="flex items-start justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <CompanyMark
            name={companyName}
            logoUrl={logoUrl}
            className="text-2xl font-bold tracking-tight text-slate-950"
            imageClassName="h-9"
            testId="crew-brand"
          />
          <p className="mt-1 text-xs text-slate-500">{copy.crewProduction}</p>
        </div>
        <div className="text-right">
          <span className="rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1 text-xs font-semibold tracking-wider text-cyan-800 uppercase">
            {spanish ? "Orden de Trabajo" : "Work Order"}
          </span>
          <p className="mt-2 text-sm font-semibold text-slate-800">#{orderNumber}</p>
          {sheet.scheduledOn ? <p className="text-xs text-slate-500">{copy.jobDate(sheet.scheduledOn)}</p> : null}
          {workerName ? (
            <p className="text-xs text-slate-700">
              {copy.crewLead}: {workerName}
            </p>
          ) : null}
        </div>
      </div>

      <div className="my-6 flex items-center justify-between gap-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
        <div>
          <h3 className="text-xs font-semibold tracking-wider text-slate-500 uppercase">
            {spanish ? "Dirección del Trabajo" : "Jobsite Address"}
          </h3>
          <p className="text-sm font-medium text-slate-950">{sheet.clientName}</p>
          {address ? <p className="text-sm text-slate-700">{address}</p> : null}
          {showTotal ? (
            <p className="mt-2 text-xs text-slate-500">
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
        {/* Flooring Trade Scope */}
        {estimate?.flooringScope && (
          estimate.flooringScope.jobType === "refinish" ? (
            <section className="space-y-4 rounded-xl border border-amber-300 bg-amber-50/40 p-5" data-testid="crew-flooring-scope">
              <div className="flex items-center justify-between border-b border-amber-200 pb-3">
                <div>
                  <h4 className="text-base font-bold text-amber-950">
                    {spanish ? "Instrucciones de Acabado de Madera" : "Hardwood Refinishing Scope & Specifications"}
                  </h4>
                  <p className="text-xs text-amber-800 font-semibold mt-0.5">
                    {REFINISH_SERVICE_LABELS[estimate.flooringScope.refinishService ?? "sand_stain_clear"] || "Hardwood Refinishing"}
                  </p>
                </div>
                <span className="rounded-md bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-900">
                  {estimate.flooringScope.refinishAreaSource === "manual"
                    ? `${estimate.flooringScope.refinishManualSqFt || 0} sq ft`
                    : `${estimate.flooringScope.rooms?.length || 0} ${spanish ? "habitaciones" : "room(s)"}`}
                </span>
              </div>
              <div className="rounded-lg border border-amber-200 bg-white p-3.5 space-y-2 text-xs">
                <p>
                  <strong>{spanish ? "Servicio Seleccionado:" : "Selected Service:"}</strong>{" "}
                  <span className="font-bold text-slate-900">
                    {REFINISH_SERVICE_LABELS[estimate.flooringScope.refinishService ?? "sand_stain_clear"]}
                  </span>
                </p>
                <p className="text-slate-600">
                  {REFINISH_SERVICE_DESCRIPTIONS[estimate.flooringScope.refinishService ?? "sand_stain_clear"]}
                </p>
                <div className="text-slate-700 pt-2 border-t border-slate-100 space-y-1">
                  <p>
                    <strong>{spanish ? "Área a trabajar:" : "Working Area:"}</strong>{" "}
                    {estimate.flooringScope.refinishAreaSource === "manual"
                      ? `${estimate.flooringScope.refinishManualSqFt || 0} sq ft (direct measurement)`
                      : `${estimate.flooringScope.rooms?.reduce((s, r) => s + (r.netSqFt || 0), 0) || 0} sq ft across ${estimate.flooringScope.rooms?.length || 0} rooms`}
                  </p>
                  {estimate.flooringScope.refinishAreaSource === "rooms" && estimate.flooringScope.rooms && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                      {estimate.flooringScope.rooms.map((rawRoom) => {
                        const room = recomputeRoomGeometry(rawRoom)
                        return (
                          <div key={room.id} className="p-2 rounded border border-slate-100 bg-slate-50">
                            <span className="font-semibold text-slate-800">{room.name}:</span> {room.netSqFt} sq ft
                          </div>
                        )
                      })}
                    </div>
                  )}
                  {estimate.flooringScope.refinishStairs && estimate.flooringScope.refinishStairs.length > 0 && (
                    <div className="pt-1">
                      <strong className="text-amber-900">{spanish ? "Escaleras:" : "Stairs Scope:"}</strong>
                      <span className="text-slate-600 ml-1">
                        {estimate.flooringScope.refinishStairs.map((s) => `${s.name} (${s.quantity})`).join(", ")}
                      </span>
                    </div>
                  )}
                  {estimate.flooringScope.refinishRepairs && estimate.flooringScope.refinishRepairs.length > 0 && (
                    <div className="pt-1">
                      <strong className="text-amber-900">{spanish ? "Reparaciones / Prep:" : "Repairs & Prep:"}</strong>
                      <span className="text-slate-600 ml-1">
                        {estimate.flooringScope.refinishRepairs.map((r) => `${r.name} (${r.quantity})`).join(", ")}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </section>
          ) : estimate.flooringScope.rooms && estimate.flooringScope.rooms.length > 0 ? (
            <section className="space-y-4 rounded-xl border border-blue-200 bg-blue-50/40 p-5" data-testid="crew-flooring-scope">
              <div className="flex items-center justify-between border-b border-blue-200 pb-3">
                <h4 className="text-base font-bold text-blue-900">
                  {spanish ? "Instrucciones de Pisos (Flooring)" : "Flooring Scope & Installation"}
                </h4>
                <span className="rounded-md bg-blue-100 px-2.5 py-1 text-xs font-bold text-blue-800">
                  {estimate.flooringScope.rooms.length} {spanish ? "habitaciones" : "room(s)"}
                </span>
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {estimate.flooringScope.rooms.map((rawRoom) => {
                  const room = recomputeRoomGeometry(rawRoom)
                  const matLabel = FLOORING_MATERIAL_LABELS[room.materialType] || room.materialName || "Flooring"
                  const dims = `${formatFeetInches(room.length)} × ${formatFeetInches(room.width)}`
                  const grossNeeded = Number((room.netSqFt * (1 + (room.wastePercent ?? 10) / 100)).toFixed(1))
                  const sqFtPerBox = room.sqFtPerBox > 0 ? room.sqFtPerBox : 20
                  const boxes = Math.ceil(grossNeeded / sqFtPerBox)

                  return (
                    <div key={room.id} className="rounded-lg border border-slate-200 bg-white p-3.5 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900 text-sm">{room.name}</span>
                        <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                          {boxes} {spanish ? "cajas" : "boxes"}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500">
                        {dims} · {room.netSqFt} sq ft net ({grossNeeded} gross sq ft)
                      </p>
                      <div className="text-xs text-slate-700 space-y-1 pt-1 border-t border-slate-100">
                        <p>
                          <strong>{spanish ? "Material:" : "Material:"}</strong> {matLabel}
                        </p>
                        <p>
                          <strong>{spanish ? "Bajo-suelo (Underlayment):" : "Underlayment:"}</strong>{" "}
                          {room.underlaymentType === "moisture_barrier"
                            ? (spanish ? "Barrera contra humedad y sonido" : "Moisture & Sound Barrier")
                            : room.underlaymentType === "foam_2mm"
                              ? (spanish ? "Espuma estándar de 2mm" : "2mm Standard Foam")
                              : room.underlaymentType === "cork"
                                ? (spanish ? "Corcho acústico de 1/4\"" : "1/4\" Acoustic Cork")
                                : room.underlaymentType === "cement_backer"
                                  ? (spanish ? "Panel de cemento de 1/2\"" : "1/2\" Cement Backer Board")
                                  : (spanish ? "Estándar" : "Standard")}
                        </p>
                        {room.subfloorPrepType !== "none" && (
                          <p className="text-amber-800">
                            <strong>{spanish ? "Prep de Subsuelo:" : "Subfloor Prep:"}</strong>{" "}
                            {room.subfloorPrepType.replace(/_/g, " ")}
                          </p>
                        )}
                        {(room.includeBaseboard || room.includeQuarterRound) && (
                          <p className="text-slate-600">
                            <strong>{spanish ? "Molduras:" : "Trim/Moulding:"}</strong>{" "}
                            {[
                              room.includeBaseboard && `${room.perimeterFt} LF ${spanish ? "Zócalo (Baseboard)" : "Baseboard"}`,
                              room.includeQuarterRound && `${room.perimeterFt} LF ${spanish ? "Cuarto de bocel" : "Quarter Round"}`,
                            ]
                              .filter(Boolean)
                              .join(" · ")}
                          </p>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </section>
          ) : null
        )}

        {/* Drywall Trade Scope */}
        {estimate?.drywallScope?.rooms && estimate.drywallScope.rooms.length > 0 && (
          <section className="space-y-4 rounded-xl border border-amber-200 bg-amber-50/40 p-5" data-testid="crew-drywall-scope">
            <div className="flex items-center justify-between border-b border-amber-200 pb-3">
              <h4 className="text-base font-bold text-amber-900">
                {spanish ? "Instrucciones de Tablaroca (Drywall)" : "Drywall Hanging & Finishing Scope"}
              </h4>
              <span className="rounded-md bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-900">
                {estimate.drywallScope.rooms.length} {spanish ? "habitaciones" : "room(s)"}
              </span>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {estimate.drywallScope.rooms.map((rawRoom) => {
                const room = recomputeDrywallRoomGeometry(rawRoom)
                const dims = `${formatFeetInches(room.length)} × ${formatFeetInches(room.width)} × ${formatFeetInches(room.height)} H`
                const boardLabel = DRYWALL_BOARD_LABELS[room.boardType] || "Drywall"
                const finishLabel = DRYWALL_FINISH_LEVEL_LABELS[room.finishLevel]?.name || `Level ${room.finishLevel}`
                const sheetSqFt = DRYWALL_BOARD_SIZE_SPECS[room.boardSize]?.sqFt || 32
                const sheets = Math.ceil((room.totalNetSqFt * (1 + (room.wastePercent ?? 10) / 100)) / sheetSqFt)

                return (
                  <div key={room.id} className="rounded-lg border border-slate-200 bg-white p-3.5 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900 text-sm">{room.name}</span>
                      <span className="text-xs font-bold text-amber-900 bg-amber-50 px-2 py-0.5 rounded">
                        {sheets} {spanish ? "hojas" : "sheets"}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500">
                      {dims} · {room.totalNetSqFt} sq ft ({spanish ? "Paredes:" : "Walls:"} {room.netWallSqFt} sf{room.includeCeiling ? `, ${spanish ? "Techo:" : "Ceiling:"} ${room.netCeilingSqFt} sf` : ""})
                    </p>
                    <div className="text-xs text-slate-700 space-y-1 pt-1 border-t border-slate-100">
                      <p>
                        <strong>{spanish ? "Tipo de Hoja:" : "Board Spec:"}</strong> {boardLabel} ({room.boardSize})
                      </p>
                      <p>
                        <strong>{spanish ? "Nivel de Acabado:" : "Finish Level:"}</strong> {finishLabel}
                      </p>
                      {room.openings?.length > 0 && (
                        <p className="text-slate-500">
                          {room.openings.length} {spanish ? "apertura(s) deducida(s)" : "opening(s) deducted"}
                        </p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        )}

        {sheet.areas.map((area, index) => {
          const showGroup = Boolean(area.groupName) && sheet.areas[index - 1]?.groupName !== area.groupName
          return (
            <div key={area.id}>
              {showGroup ? (
                <h2 className="mb-3 text-xs font-semibold tracking-wider text-slate-500 uppercase" data-testid="crew-group">
                  {say(area.groupName ?? "")}
                </h2>
              ) : null}
              <section className="space-y-4 rounded-xl border border-slate-200 bg-slate-50 p-5">
                <div className="flex items-center justify-between gap-3 border-b border-slate-200 pb-3">
                  <h4 className="text-base font-bold text-cyan-800">{say(area.name)}</h4>
                  {showItems ? (
                    <span className="rounded-md bg-white px-2.5 py-1 text-xs text-slate-700">
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
  )
}
