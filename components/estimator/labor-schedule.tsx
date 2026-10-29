"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { moneyExact } from "@/lib/format"
import { depositAmount } from "@/lib/payments/deposit"
import {
  DEFAULT_SURFACE_RATES,
  SURFACE_LABELS,
  SURFACE_TYPES,
  SURFACE_UNITS,
  laborPaymentSchedule,
  type PaymentMilestone,
  type SurfaceType,
} from "@/lib/payments/schedule"

interface SurfaceEntry {
  id: string
  surfaceType: SurfaceType
  quantity: number
  coats: number
  productionRate: number
}

const STARTING_SURFACES: SurfaceEntry[] = [
  { id: "surface-drywall", surfaceType: "drywall", quantity: 1200, coats: 2, productionRate: 150 },
  { id: "surface-trim", surfaceType: "trim_linear", quantity: 250, coats: 2, productionRate: 80 },
]

export function LaborSchedule() {
  const [hourlyRate, setHourlyRate] = useState("65")
  const [depositPercent, setDepositPercent] = useState<number>(30)
  const [surfaces, setSurfaces] = useState<SurfaceEntry[]>(STARTING_SURFACES)
  const [milestones, setMilestones] = useState<PaymentMilestone[]>([])
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  const rate = numberFrom(hourlyRate)
  const split = milestoneSplit(depositPercent)
  const preview = laborPaymentSchedule({
    surfaces,
    hourlyRate: rate,
    ...split,
  })
  const grandTotal = preview.ok ? preview.schedule.totalCost : 0
  const depositDue = depositAmount(grandTotal, depositPercent)

  const updateSurface = (id: string, patch: Partial<Omit<SurfaceEntry, "id">>) => {
    setMilestones([])
    setSurfaces((current) =>
      current.map((surface) => {
        if (surface.id !== id) return surface
        const next = { ...surface, ...patch }
        if (patch.surfaceType) next.productionRate = DEFAULT_SURFACE_RATES[patch.surfaceType]
        return next
      }),
    )
  }

  const generateSchedule = async () => {
    setPending(true)
    setError(null)
    try {
      const response = await fetch("/api/estimates/calculate-milestones", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          surfaces,
          hourlyRate: rate,
          ...split,
        }),
      })
      const body = (await response.json().catch(() => null)) as {
        error?: string
        milestones?: PaymentMilestone[]
      } | null
      if (!response.ok || !body?.milestones) {
        setMilestones([])
        setError(body?.error ?? "Could not build the payment schedule.")
        return
      }
      setMilestones(body.milestones)
    } catch {
      setError("Could not build the payment schedule.")
    } finally {
      setPending(false)
    }
  }

  return (
    <section data-testid="labor-schedule" className="flex flex-col gap-4 border-t border-border pt-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Labor payment schedule</h2>
          <p className="text-sm text-muted-foreground">
            Hours are quantity times coats, divided by the production rate. The proposal total above still comes from the rooms.
          </p>
        </div>
        <div className="flex gap-3">
          <div className="grid w-28 gap-1">
            <Label htmlFor="depositPercent">Deposit %</Label>
            <input
              id="depositPercent"
              type="number"
              value={depositPercent}
              data-testid="labor-deposit-percent"
              onChange={(e) => {
                setDepositPercent(Number(e.target.value))
                setMilestones([])
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-muted-foreground tabular-nums" data-testid="labor-deposit-amount">
              {moneyExact(depositDue)}
            </p>
          </div>
          <div className="grid w-28 gap-1">
            <Label htmlFor="labor-hourly-rate">Hourly rate</Label>
            <Input
              id="labor-hourly-rate"
              inputMode="decimal"
              value={hourlyRate}
              className="h-11 text-right"
              data-testid="labor-hourly-rate"
              onValueChange={(value) => {
                setHourlyRate(value)
                setMilestones([])
              }}
            />
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {surfaces.map((surface) => {
          const hours =
            surface.productionRate > 0 ? (surface.quantity * surface.coats) / surface.productionRate : 0
          return (
            <div
              key={surface.id}
              className="grid gap-3 rounded-2xl bg-card p-3 border border-slate-200 bg-white shadow-sm md:grid-cols-[minmax(0,1.4fr)_repeat(2,minmax(0,0.7fr))_minmax(0,0.9fr)_auto] md:items-end"
            >
              <div className="grid gap-1">
                <Label htmlFor={`${surface.id}-type`}>Surface</Label>
                <select
                  id={`${surface.id}-type`}
                  value={surface.surfaceType}
                  className="h-11 rounded-lg border border-input bg-transparent px-2"
                  onChange={(event) => {
                    const value = event.target.value
                    if (!(SURFACE_TYPES as readonly string[]).includes(value)) return
                    updateSurface(surface.id, { surfaceType: value as SurfaceType })
                  }}
                >
                  {SURFACE_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {SURFACE_LABELS[type]} ({SURFACE_UNITS[type]})
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid gap-1">
                <Label htmlFor={`${surface.id}-quantity`}>Quantity</Label>
                <Input
                  id={`${surface.id}-quantity`}
                  inputMode="decimal"
                  value={String(surface.quantity)}
                  className="h-11 text-right"
                  data-testid={`surface-quantity-${surface.id}`}
                  onValueChange={(value) => updateSurface(surface.id, { quantity: numberFrom(value) })}
                />
              </div>
              <div className="grid gap-1">
                <Label htmlFor={`${surface.id}-coats`}>Coats</Label>
                <Input
                  id={`${surface.id}-coats`}
                  inputMode="decimal"
                  value={String(surface.coats)}
                  className="h-11 text-right"
                  onValueChange={(value) => updateSurface(surface.id, { coats: numberFrom(value) })}
                />
              </div>
              <p className="text-sm text-muted-foreground">
                {surface.productionRate} {SURFACE_UNITS[surface.surfaceType]}/hr
                <span className="mt-1 block font-medium text-foreground tabular-nums">
                  {hours.toFixed(2)} hr
                </span>
              </p>
              <Button
                type="button"
                variant="outline"
                className="h-11"
                onClick={() => {
                  setMilestones([])
                  setSurfaces((current) => current.filter((item) => item.id !== surface.id))
                }}
              >
                Remove
              </Button>
            </div>
          )
        })}
      </div>

      <Button
        type="button"
        variant="outline"
        className="h-11 self-start"
        data-testid="add-surface"
        onClick={() => {
          setMilestones([])
          setSurfaces((current) => [
            ...current,
            {
              id: crypto.randomUUID(),
              surfaceType: "siding",
              quantity: 500,
              coats: 2,
              productionRate: DEFAULT_SURFACE_RATES.siding,
            },
          ])
        }}
      >
        Add surface
      </Button>

      <div className="flex flex-col gap-3 rounded-2xl bg-card p-4 border border-slate-200 bg-white shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold tracking-[0.14em] text-muted-foreground uppercase">
            Total calculated labor
          </p>
          <p className="font-display text-3xl tabular-nums" data-testid="labor-hours">
            {preview.ok ? preview.schedule.totalLaborHours.toFixed(2) : "0.00"} hr
          </p>
        </div>
        <div className="sm:text-right">
          <p className="text-xs font-semibold tracking-[0.14em] text-muted-foreground uppercase">
            Labor cost
          </p>
          <p className="font-display text-3xl text-price tabular-nums" data-testid="labor-cost">
            {preview.ok ? moneyExact(preview.schedule.totalCost) : moneyExact(0)}
          </p>
        </div>
      </div>

      <Button
        type="button"
        className="h-11"
        disabled={pending}
        data-testid="generate-schedule"
        onClick={() => void generateSchedule()}
      >
        {pending ? "Generating milestones" : "Generate payment schedule"}
      </Button>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      {milestones.length > 0 ? (
        <div className="grid gap-3 md:grid-cols-3" data-testid="payment-milestones">
          {milestones.map((milestone) => (
            <div key={milestone.id} className="rounded-2xl bg-card p-4 text-center border border-slate-200 bg-white shadow-sm">
              <p className="text-xs font-semibold tracking-[0.14em] text-muted-foreground uppercase">
                {milestone.percentage}%
              </p>
              <p className="mt-1 font-display text-2xl text-price tabular-nums">{moneyExact(milestone.amount)}</p>
              <p className="mt-1 text-sm font-medium">{milestone.label}</p>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  )
}

function milestoneSplit(depositPercent: number) {
  const depositPct = Math.min(100, Math.max(0, depositPercent))
  const rest = 100 - depositPct
  const progressPct = Math.round(((rest * 50) / 70) * 100) / 100
  const completionPct = Math.round((rest - progressPct) * 100) / 100
  return { depositPct, progressPct, completionPct }
}

function numberFrom(value: string): number {
  if (!value.trim()) return 0
  const number = Number(value)
  if (!Number.isFinite(number) || number < 0) return 0
  return number
}
