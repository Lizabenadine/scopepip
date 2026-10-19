"use client"

import { useState } from "react"
import { TemplatePicker } from "@/components/estimator/template-picker"
import { measureArea } from "@/lib/estimate/calculate"
import { ratesForKind } from "@/lib/estimate/kinds"
import type { AreaInput, EstimateKind, ProductionRate, SurfaceInput } from "@/lib/types"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export function AreaEditor({
  areas,
  rates,
  kind,
  onChange,
}: {
  areas: AreaInput[]
  rates: ProductionRate[]
  kind: EstimateKind
  onChange: (areas: AreaInput[], title?: string) => void
}) {
  const [templatesOpen, setTemplatesOpen] = useState(false)

  const addBlank = () => {
    onChange([
      ...areas,
      {
        id: crypto.randomUUID(),
        name: "Room",
        areaType: "room",
        lengthFt: 0,
        widthFt: 0,
        heightFt: 8,
        crewNote: "",
        surfaces: [],
      },
    ])
  }

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-xs font-semibold tracking-[0.14em] text-muted-foreground uppercase">
          Areas
        </h2>
        <div className="flex gap-3">
          <button
            type="button"
            className="text-sm font-medium text-primary"
            data-testid="open-templates"
            onClick={() => setTemplatesOpen(true)}
          >
            Templates
          </button>
          <button type="button" className="text-sm font-medium text-primary" data-testid="add-custom-area" onClick={addBlank}>
            Custom area
          </button>
        </div>
      </div>
      <TemplatePicker
        open={templatesOpen}
        kind={kind}
        onOpenChange={setTemplatesOpen}
        onAdd={(next, title) => onChange([...areas, ...next], title)}
      />
      {areas.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border px-4 py-6 text-sm text-muted-foreground">
          Open Templates for a bedroom, a full interior, or an exterior. A custom area starts empty.
        </p>
      ) : null}
      {areas.map((area) => (
        <AreaCard
          key={area.id}
          area={area}
          rates={ratesForArea(rates, kind, area)}
          onChange={(next) => onChange(areas.map((item) => (item.id === area.id ? next : item)))}
          onRemove={() => onChange(areas.filter((item) => item.id !== area.id))}
        />
      ))}
    </section>
  )
}

function AreaCard({
  area,
  rates,
  onChange,
  onRemove,
}: {
  area: AreaInput
  rates: ProductionRate[]
  onChange: (area: AreaInput) => void
  onRemove: () => void
}) {
  const measures = measureArea(area)
  const toggle = (rate: ProductionRate) => {
    const existing = area.surfaces.find((surface) => surface.rateId === rate.id)
    const surfaces = existing
      ? area.surfaces.filter((surface) => surface.rateId !== rate.id)
      : [
          ...area.surfaces,
          {
            id: crypto.randomUUID(),
            rateId: rate.id,
            coatCount: rate.coatRates[rate.coatRates.length - 1]?.coats ?? 2,
            itemCount: rate.measure === "items" ? 1 : 0,
            quantityOverride: null,
            crewNote: "",
          } satisfies SurfaceInput,
        ]
    onChange({ ...area, surfaces })
  }

  return (
    <div className="rounded-2xl bg-card p-4 ring-1 ring-foreground/10">
      <div className="flex items-start justify-between gap-3">
        <div className="grid flex-1 gap-2">
          <Label htmlFor={`${area.id}-name`}>Area</Label>
          <Input
            id={`${area.id}-name`}
            value={area.name}
            className="h-11"
            onValueChange={(name) => onChange({ ...area, name })}
          />
        </div>
        <button type="button" className="text-sm text-muted-foreground" onClick={onRemove}>
          Remove
        </button>
      </div>
      <div className="mt-3 flex gap-2">
        {(["room", "surface"] as const).map((areaType) => (
          <button
            key={areaType}
            type="button"
            onClick={() => onChange({ ...area, areaType })}
            className={
              area.areaType === areaType
                ? "rounded-full bg-primary px-3 py-1.5 text-sm text-primary-foreground"
                : "rounded-full bg-muted px-3 py-1.5 text-sm"
            }
          >
            {areaType === "room" ? "Room" : "Single surface"}
          </button>
        ))}
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2">
        <NumberField
          id={`${area.id}-length`}
          label="Length"
          value={area.lengthFt}
          onChange={(lengthFt) => onChange({ ...area, lengthFt })}
        />
        <NumberField
          id={`${area.id}-width`}
          label="Width"
          value={area.widthFt}
          onChange={(widthFt) => onChange({ ...area, widthFt })}
        />
        <NumberField
          id={`${area.id}-height`}
          label="Height"
          value={area.heightFt}
          onChange={(heightFt) => onChange({ ...area, heightFt })}
        />
      </div>
      <p className="mt-2 text-xs text-muted-foreground" data-testid="area-measures">
        {measures.wallSqFt} sq ft walls · {measures.ceilingSqFt} sq ft ceiling · {measures.perimeterLnFt} ln ft
      </p>
      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        <div className="grid gap-1">
          <Label htmlFor={`${area.id}-prep`}>Prep intensity</Label>
          <select
            id={`${area.id}-prep`}
            className="h-11 rounded-lg border border-input bg-transparent px-2"
            value={area.prepLevel ?? "none"}
            onChange={(event) =>
              onChange({ ...area, prepLevel: event.target.value as "none" | "light" | "medium" | "heavy" })
            }
          >
            <option value="none">None</option>
            <option value="light">Light</option>
            <option value="medium">Medium</option>
            <option value="heavy">Heavy</option>
          </select>
        </div>
        <NumberField
          id={`${area.id}-prep-hours`}
          label="Prep hours"
          value={area.prepHours ?? 0}
          onChange={(prepHours) => onChange({ ...area, prepHours: prepHours > 0 ? prepHours : null })}
        />
        <div className="grid gap-1">
          <Label htmlFor={`${area.id}-access`}>Access multiplier</Label>
          <select
            id={`${area.id}-access`}
            className="h-11 rounded-lg border border-input bg-transparent px-2"
            value={accessPreset(area.accessFactor)}
            onChange={(event) => {
              const preset = event.target.value
              if (preset === "1") onChange({ ...area, accessFactor: 1 })
              else if (preset === "1.25") onChange({ ...area, accessFactor: 1.25 })
              else onChange({ ...area, accessFactor: customAccess(area.accessFactor) })
            }}
          >
            <option value="1">Standard (1.0)</option>
            <option value="1.25">High ladder (1.25)</option>
            <option value="custom">Custom</option>
          </select>
          {accessPreset(area.accessFactor) === "custom" ? (
            <NumberField
              id={`${area.id}-access-custom`}
              label="Custom multiplier"
              value={area.accessFactor ?? 1}
              onChange={(accessFactor) =>
                onChange({ ...area, accessFactor: accessFactor > 0 ? accessFactor : 1 })
              }
            />
          ) : null}
        </div>
      </div>
      <h3 className="mt-4 text-xs font-semibold tracking-[0.14em] text-muted-foreground uppercase">
        Surfaces
      </h3>
      <div className="mt-2 flex flex-col gap-3">
        {rateGroups(rates).map((group) => (
          <div key={group.category} className="flex flex-col gap-2">
            <p className="text-xs font-medium text-muted-foreground">{group.category}</p>
            {group.rates.map((rate) => {
              const surface = area.surfaces.find((item) => item.rateId === rate.id)
              return (
                <div key={rate.id} className="flex items-center justify-between gap-2">
                  <button type="button" className="text-left text-sm font-medium" onClick={() => toggle(rate)}>
                    <span className={surface ? "" : "text-muted-foreground"}>{rate.internalLabel}</span>
                  </button>
                  {surface ? (
                    <div className="flex items-center gap-2">
                      {rate.measure === "items" || rate.measure === "shutters" ? (
                        <Input
                          aria-label={`${rate.internalLabel} count`}
                          value={String(surface.itemCount)}
                          className="h-10 w-16 text-center"
                          onValueChange={(value) =>
                            onChange({
                              ...area,
                              surfaces: area.surfaces.map((item) =>
                                item.id === surface.id ? { ...item, itemCount: Number(value) || 0 } : item,
                              ),
                            })
                          }
                        />
                      ) : null}
                      <label className="text-xs text-muted-foreground">
                        Primer
                        <select
                          className="ml-1 h-10 rounded-lg border border-input bg-transparent px-2"
                          value={surface.primerCoats ?? 0}
                          onChange={(event) =>
                            onChange({
                              ...area,
                              surfaces: area.surfaces.map((item) =>
                                item.id === surface.id ? { ...item, primerCoats: Number(event.target.value) } : item,
                              ),
                            })
                          }
                        >
                          {[0, 1, 2].map((coats) => (
                            <option key={coats} value={coats}>
                              {coats}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="text-xs text-muted-foreground">
                        Finish
                        <select
                          className="ml-1 h-10 rounded-lg border border-input bg-transparent px-2"
                          value={surface.finishCoats ?? surface.coatCount}
                          onChange={(event) =>
                            onChange({
                              ...area,
                              surfaces: area.surfaces.map((item) =>
                                item.id === surface.id
                                  ? { ...item, coatCount: Number(event.target.value), finishCoats: Number(event.target.value) }
                                  : item,
                              ),
                            })
                          }
                        >
                          {rate.coatRates.map((entry) => (
                            <option key={entry.coats} value={entry.coats}>
                              {entry.coats}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>
                  ) : null}
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}

function ratesForArea(rates: ProductionRate[], kind: EstimateKind, area: AreaInput): ProductionRate[] {
  const allowed = ratesForKind(rates, kind)
  const extras = rates.filter(
    (rate) => area.surfaces.some((surface) => surface.rateId === rate.id) && !allowed.some((item) => item.id === rate.id),
  )
  return [...allowed, ...extras]
}

function rateGroups(rates: ProductionRate[]): { category: string; rates: ProductionRate[] }[] {
  const groups: { category: string; rates: ProductionRate[] }[] = []
  for (const rate of rates) {
    const existing = groups.find((group) => group.category === rate.category)
    if (existing) existing.rates.push(rate)
    else groups.push({ category: rate.category, rates: [rate] })
  }
  return groups
}

function accessPreset(factor: number | undefined): "1" | "1.25" | "custom" {
  if (factor === 1.25) return "1.25"
  if (factor === undefined || factor === 1) return "1"
  return "custom"
}

function customAccess(factor: number | undefined): number {
  if (factor && factor !== 1 && factor !== 1.25) return factor
  return 1.5
}

function NumberField({
  id,
  label,
  value,
  onChange,
}: {
  id: string
  label: string
  value: number
  onChange: (value: number) => void
}) {
  return (
    <div className="grid gap-1">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        inputMode="decimal"
        value={String(value)}
        className="h-11"
        onValueChange={(next) => onChange(Number(next.replace(/[^0-9.]/g, "")) || 0)}
      />
    </div>
  )
}
