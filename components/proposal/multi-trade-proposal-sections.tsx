"use client"

import { useMemo } from "react"
import { Layers, FileSpreadsheet } from "lucide-react"
import { money, moneyExact } from "@/lib/format"
import { formatFeetInches } from "@/lib/estimate/dimensions"
import { calculateFlooringQuote, recomputeRoomGeometry } from "@/lib/flooring/calculate"
import { calculateDrywallQuote, recomputeDrywallRoomGeometry } from "@/lib/drywall/calculate"
import { FLOORING_MATERIAL_LABELS } from "@/lib/flooring/defaults"
import { DRYWALL_BOARD_LABELS, DRYWALL_BOARD_SIZE_SPECS, DRYWALL_FINISH_LEVEL_LABELS } from "@/lib/drywall/defaults"
import type { Estimate } from "@/lib/types"
import type { MultiTradeQuote, FlooringRoom, DrywallRoom } from "@/lib/estimate/multi-trade-types"

export function MultiTradeProposalSections({
  estimate,
  multiTradeQuote,
}: {
  estimate: Estimate
  multiTradeQuote?: MultiTradeQuote
}) {
  const flooringQuote = useMemo(() => {
    if (!estimate.flooringScope || !estimate.flooringScope.rooms?.length) return null
    return calculateFlooringQuote(estimate.flooringScope)
  }, [estimate.flooringScope])

  const drywallQuote = useMemo(() => {
    if (!estimate.drywallScope || !estimate.drywallScope.rooms?.length) return null
    return calculateDrywallQuote(estimate.drywallScope)
  }, [estimate.drywallScope])

  return (
    <div className="flex flex-col gap-5">
      {/* 1. Multi-Trade Overview Breakdown if multiple trades active */}
      {multiTradeQuote && multiTradeQuote.tradeSummaries.length > 1 && (
        <section
          data-testid="proposal-multitrade-summary"
          className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs"
        >
          <div className="flex items-center gap-2 mb-3">
            <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-bold text-blue-700">
              <Layers className="size-3.5" /> Multi-Trade Project
            </span>
            <h2 className="text-sm font-bold text-slate-900">Unified Multi-Trade Investment Breakdown</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {multiTradeQuote.tradeSummaries.map((summary) => (
              <div
                key={summary.trade}
                className="flex items-center justify-between p-3.5 rounded-xl border border-slate-100 bg-slate-50/70"
              >
                <div>
                  <p className="text-xs font-bold text-slate-800">{summary.label}</p>
                  <p className="text-[11px] font-medium text-slate-500 mt-0.5">{summary.netQuantityLabel}</p>
                </div>
                <p className="text-sm font-black text-slate-900">{money(summary.total)}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 2. Flooring Scope of Work */}
      {estimate.flooringScope && estimate.flooringScope.rooms?.length > 0 && flooringQuote && (
        <section
          id="proposal-page-flooring"
          data-testid="proposal-page-flooring"
          className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs flex flex-col gap-4"
        >
          <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-slate-100 pb-3">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-blue-600">Flooring Scope</span>
              <h3 className="text-lg font-bold text-slate-900 mt-0.5">Flooring Installation &amp; Materials</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {flooringQuote.netSqFt.toLocaleString()} sq ft net · {flooringQuote.totalBoxes} cartons / boxes
              </p>
            </div>
            <div className="text-right">
              <span className="text-xs font-semibold text-slate-400">Flooring Total</span>
              <p className="text-xl font-black text-slate-900">{money(flooringQuote.total)}</p>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            {estimate.flooringScope.rooms.map((rawRoom: FlooringRoom) => {
              const room = recomputeRoomGeometry(rawRoom)
              const matLabel = FLOORING_MATERIAL_LABELS[room.materialType] || room.materialName || "Flooring"
              const dims = `${formatFeetInches(room.length)} × ${formatFeetInches(room.width)}`
              const grossNeeded = Number((room.netSqFt * (1 + (room.wastePercent ?? 10) / 100)).toFixed(1))
              const sqFtPerBox = room.sqFtPerBox > 0 ? room.sqFtPerBox : 20
              const boxes = Math.ceil(grossNeeded / sqFtPerBox)

              return (
                <div
                  key={room.id}
                  className="rounded-xl border border-slate-200/80 bg-slate-50/40 p-3.5 flex flex-col gap-2"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm">{room.name}</h4>
                      <p className="text-xs text-slate-500">
                        {dims} · <strong className="text-slate-700">{room.netSqFt} sq ft net</strong>
                        {room.deductions?.length > 0 && ` (${room.deductions.length} deduction area[s])`}
                      </p>
                    </div>
                    <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md">
                      {boxes} boxes
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1 border-t border-slate-100">
                    <p className="text-slate-600">
                      <strong className="text-slate-800">Material:</strong> {matLabel} ({grossNeeded} gross sq ft with {room.wastePercent}% waste)
                    </p>
                    <p className="text-slate-600">
                      <strong className="text-slate-800">Underlayment:</strong> {room.underlaymentType !== "none" ? room.underlaymentType : "Standard"}
                      {room.subfloorPrepType !== "none" && ` · Prep: ${room.subfloorPrepType}`}
                    </p>
                    {(room.includeBaseboard || room.includeQuarterRound) && (
                      <p className="text-slate-600 col-span-full">
                        <strong className="text-slate-800">Moulding &amp; Trim:</strong>{" "}
                        {[
                          room.includeBaseboard && `${room.perimeterFt} LF Baseboards`,
                          room.includeQuarterRound && `${room.perimeterFt} LF Quarter Round`,
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
      )}

      {/* 3. Drywall Scope of Work */}
      {estimate.drywallScope && estimate.drywallScope.rooms?.length > 0 && drywallQuote && (
        <section
          id="proposal-page-drywall"
          data-testid="proposal-page-drywall"
          className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs flex flex-col gap-4"
        >
          <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-slate-100 pb-3">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-amber-700">Drywall Scope</span>
              <h3 className="text-lg font-bold text-slate-900 mt-0.5">Drywall Hanging &amp; Level 0–5 Finishing</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {drywallQuote.totalNetSqFt.toLocaleString()} sq ft net · {drywallQuote.totalSheets} sheets
              </p>
            </div>
            <div className="text-right">
              <span className="text-xs font-semibold text-slate-400">Drywall Total</span>
              <p className="text-xl font-black text-slate-900">{money(drywallQuote.total)}</p>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            {estimate.drywallScope.rooms.map((rawRoom: DrywallRoom) => {
              const room = recomputeDrywallRoomGeometry(rawRoom)
              const dims = `${formatFeetInches(room.length)} × ${formatFeetInches(room.width)} × ${formatFeetInches(room.height)} H`
              const boardLabel = DRYWALL_BOARD_LABELS[room.boardType] || "Drywall"
              const finishLabel = DRYWALL_FINISH_LEVEL_LABELS[room.finishLevel]?.name || `Level ${room.finishLevel}`
              const sheetSqFt = DRYWALL_BOARD_SIZE_SPECS[room.boardSize]?.sqFt || 32
              const sheets = Math.ceil((room.totalNetSqFt * (1 + (room.wastePercent ?? 10) / 100)) / sheetSqFt)

              return (
                <div
                  key={room.id}
                  className="rounded-xl border border-slate-200/80 bg-slate-50/40 p-3.5 flex flex-col gap-2"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm">{room.name}</h4>
                      <p className="text-xs text-slate-500">
                        {dims} · <strong className="text-slate-700">{room.totalNetSqFt} sq ft total</strong> (Walls: {room.netWallSqFt} sf{room.includeCeiling ? `, Ceiling: ${room.netCeilingSqFt} sf` : ""})
                      </p>
                    </div>
                    <span className="text-xs font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md">
                      {sheets} sheets
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1 border-t border-slate-100">
                    <p className="text-slate-600">
                      <strong className="text-slate-800">Board Specification:</strong> {boardLabel} ({room.boardSize})
                    </p>
                    <p className="text-slate-600">
                      <strong className="text-slate-800">Finish Level:</strong> {finishLabel}
                    </p>
                    {room.openings?.length > 0 && (
                      <p className="text-slate-600 col-span-full">
                        <strong className="text-slate-800">Deductions:</strong> {room.openings.length} door/window opening(s) deducted from sheet count
                      </p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      )}
    </div>
  )
}
