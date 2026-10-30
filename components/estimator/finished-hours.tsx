"use client"

import { useState, type KeyboardEvent } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useScope } from "@/lib/data/store"
import type { PricedArea } from "@/lib/estimate/calculate"
import { learnRoomPace } from "@/lib/estimate/learned-pace"
import { translatePainting } from "@/lib/field/terms"
import { hoursLabel } from "@/lib/format"
import { officeLabel } from "@/lib/office/dashboard-copy"
import type { FieldLanguage } from "@/lib/field/language"
import type { AreaInput, ProductionRate } from "@/lib/types"

function speedUnit(basis: ProductionRate["basis"], language: FieldLanguage): string {
  if (basis === "hours_per_item") return language === "es" ? "h c/u" : "hrs each"
  if (basis === "lnft_per_hour") return language === "es" ? "pies lin/h" : "ln ft/hr"
  return language === "es" ? "pies²/h" : "sq ft/hr"
}

function speedLines(
  speeds: { rateId: string; coats: number; value: number }[],
  rates: ProductionRate[],
  language: FieldLanguage,
): string[] {
  return speeds.flatMap((speed) => {
    const rate = rates.find((item) => item.id === speed.rateId)
    const before = rate?.coatRates.find((entry) => entry.coats === speed.coats)?.value
    if (!rate || before == null) return []
    const name = translatePainting(rate.internalLabel, language)
    const unit = speedUnit(rate.basis, language)
    if (language === "es") return [`${name} pasa de ${before} ${unit} a ${speed.value}.`]
    return [`${name} goes from ${before} ${unit} to ${speed.value}.`]
  })
}

export function FinishedHours({
  estimateId,
  areas,
  pricedAreas,
  rates,
  language,
}: {
  estimateId: string
  areas: AreaInput[]
  pricedAreas: PricedArea[]
  rates: ProductionRate[]
  language: FieldLanguage
}) {
  const scope = useScope()
  const [hours, setHours] = useState<Record<string, string>>({})
  const [notes, setNotes] = useState<Record<string, string[]>>({})
  const say = (text: string) => officeLabel(text, language)

  if (scope.session?.role === "project_manager" || scope.session?.role === "estimator") return null

  const keepEnterInPlace = (event: KeyboardEvent) => {
    if (event.key === "Enter") {
      event.preventDefault()
      event.stopPropagation()
    }
  }

  return (
    <section className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm" data-testid="finished-hours">
      <div>
        <h2 className="text-xs font-semibold tracking-[0.14em] text-muted-foreground uppercase">
          {say("Hours from this job")}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {say("This job's price stays. The next room of this size uses this speed.")}
        </p>
      </div>
      {pricedAreas.map((priced) => {
        const area = areas.find((item) => item.id === priced.id)
        if (!area) return null
        const saved = scope.learnedPaces.find(
          (pace) => pace.estimateId === estimateId && pace.areaId === area.id,
        )
        const value = hours[area.id] ?? (saved ? String(saved.actualHours) : "")
        const lines = notes[area.id] ?? (saved ? speedLines(saved.speeds, rates, language) : [])
        return (
          <div key={area.id} className="grid gap-2" onKeyDown={keepEnterInPlace}>
            <div className="flex items-baseline justify-between gap-3">
              <p className="text-sm font-medium">
                {translatePainting(area.name, language)}
                <span className="ml-2 font-normal text-muted-foreground">
                  {area.lengthFt}×{area.widthFt}×{area.heightFt}
                </span>
              </p>
              <p className="text-xs text-muted-foreground">
                {say("Estimated hours")} {hoursLabel(priced.allocatedHours)}
              </p>
            </div>
            <div className="flex items-end gap-2">
              <div className="grid flex-1 gap-1">
                <label htmlFor={`hours-${area.id}`} className="text-xs text-muted-foreground">
                  {say("Hours this room took")}
                </label>
                <Input
                  id={`hours-${area.id}`}
                  inputMode="decimal"
                  value={value}
                  data-testid={`finished-hours-${area.id}`}
                  onKeyDown={keepEnterInPlace}
                  onValueChange={(next) => setHours((current) => ({ ...current, [area.id]: next }))}
                />
              </div>
              <Button
                type="button"
                className="h-8"
                data-testid={`finished-hours-save-${area.id}`}
                onClick={() => {
                  const actualHours = Number(value)
                  const result = learnRoomPace({
                    estimateId,
                    area,
                    rates,
                    estimatedHours: priced.allocatedHours,
                    surfaceHours: priced.surfaces.map((surface) => ({
                      id: surface.id,
                      allocatedHours: surface.allocatedHours,
                    })),
                    actualHours,
                  })
                  if (!result.ok) {
                    setNotes((current) => ({ ...current, [area.id]: [say(result.reason)] }))
                    return
                  }
                  scope.rememberPace(result.pace)
                  setNotes((current) => ({
                    ...current,
                    [area.id]: speedLines(result.pace.speeds, rates, language),
                  }))
                }}
              >
                {say("Save this speed")}
              </Button>
            </div>
            {lines.length > 0 ? (
              <div className="grid gap-1 text-sm" data-testid={`finished-hours-result-${area.id}`}>
                {lines.map((line) => (
                  <p key={line}>{line}</p>
                ))}
              </div>
            ) : null}
            {saved ? (
              <button
                type="button"
                className="justify-self-start text-sm font-medium text-primary"
                data-testid={`finished-hours-forget-${area.id}`}
                onClick={() => {
                  scope.forgetPace(estimateId, area.id)
                  setHours((current) => ({ ...current, [area.id]: "" }))
                  setNotes((current) => ({ ...current, [area.id]: [] }))
                }}
              >
                {say("Use the rate card again")}
              </button>
            ) : null}
          </div>
        )
      })}
    </section>
  )
}
