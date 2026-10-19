"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { timeBasedRate } from "@/lib/estimate/calculate"
import { useScope } from "@/lib/data/store"
import type { ProductionRate } from "@/lib/types"

export function TimeRates() {
  const scope = useScope()
  const [quantity, setQuantity] = useState("425")
  const [hours, setHours] = useState("5")
  const [basis, setBasis] = useState<"area" | "item">("area")
  const [rateId, setRateId] = useState("walls")
  const [coats, setCoats] = useState(2)
  const selected = scope.productionRates.find((rate) => rate.id === rateId) ?? scope.productionRates[0]
  const result = timeBasedRate(Number(quantity) || 0, Number(hours) || 0, basis)
  const unit = basis === "item" ? "hrs/item" : "per hour"

  return (
    <section className="flex flex-col gap-4" data-testid="time-rates">
      <div>
        <h2 className="text-xs font-semibold tracking-[0.14em] text-muted-foreground uppercase">
          Time-based rates
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          A time-based rate is how far an experienced painter gets in an hour at a comfortable speed, for that coat count. 425 sq ft of walls painted with two coats in 5 hours is 85 sq ft/hr. Choose three through six coats to save a speed past the two already on the rate. When painters work at different speeds, keep this average and pay the faster ones more.
        </p>
      </div>
      <div className="grid gap-3 rounded-2xl bg-card p-4 ring-1 ring-foreground/10 sm:grid-cols-2">
        <div className="grid gap-1">
          <Label htmlFor="time-rate-quantity">Size or count</Label>
          <Input
            id="time-rate-quantity"
            data-testid="time-rate-quantity"
            value={quantity}
            className="h-11"
            onValueChange={setQuantity}
          />
        </div>
        <div className="grid gap-1">
          <Label htmlFor="time-rate-hours">Hours it took</Label>
          <Input
            id="time-rate-hours"
            data-testid="time-rate-hours"
            value={hours}
            className="h-11"
            onValueChange={setHours}
          />
        </div>
        <div className="grid gap-1">
          <Label htmlFor="time-rate-basis">Kind</Label>
          <select
            id="time-rate-basis"
            data-testid="time-rate-basis"
            value={basis}
            className="h-11 rounded-lg border border-input bg-transparent px-2 text-sm"
            onChange={(event) => setBasis(event.target.value === "item" ? "item" : "area")}
          >
            <option value="area">Area or trim (size ÷ hours)</option>
            <option value="item">Each item (hours ÷ count)</option>
          </select>
        </div>
        <p className="self-end text-sm" data-testid="time-rate-result">
          {trimRate(result)} {unit}
        </p>
        <div className="grid gap-1">
          <Label htmlFor="time-rate-target">Save onto</Label>
          <select
            id="time-rate-target"
            data-testid="time-rate-target"
            value={selected?.id ?? ""}
            className="h-11 rounded-lg border border-input bg-transparent px-2 text-sm"
            onChange={(event) => {
              setRateId(event.target.value)
              const next = scope.productionRates.find((rate) => rate.id === event.target.value)
              setCoats(next?.coatRates[next.coatRates.length - 1]?.coats ?? 2)
            }}
          >
            {scope.productionRates.map((rate) => (
              <option key={rate.id} value={rate.id}>
                {rate.internalLabel}
              </option>
            ))}
          </select>
        </div>
        <div className="grid gap-1">
          <Label htmlFor="time-rate-coats">Coat count</Label>
          <select
            id="time-rate-coats"
            data-testid="time-rate-coats"
            value={String(coats)}
            className="h-11 rounded-lg border border-input bg-transparent px-2 text-sm"
            onChange={(event) => setCoats(Number(event.target.value))}
          >
            {[1, 2, 3, 4, 5, 6].map((count) => (
              <option key={count} value={count}>
                {count} {count === 1 ? "coat" : "coats"}
              </option>
            ))}
          </select>
        </div>
        <Button
          type="button"
          className="h-11 sm:col-span-2"
          data-testid="time-rate-apply"
          disabled={!selected || result <= 0}
          onClick={() => {
            if (!selected) return
            scope.setCoatRate(selected.id, coats, result)
          }}
        >
          Use this rate
        </Button>
      </div>
      <div className="flex flex-col gap-2">
        {scope.productionRates.map((rate) => (
          <div key={rate.id} className="rounded-2xl bg-card px-4 py-3 ring-1 ring-foreground/10">
            <p className="font-medium">{rate.internalLabel}</p>
            <p className="text-sm text-muted-foreground">
              {rate.category} · {basisLabel(rate)}
            </p>
            <div className="mt-2 flex flex-wrap gap-3">
              {rate.coatRates.map((entry) => (
                <CoatField
                  key={entry.coats}
                  label={`${rate.internalLabel}, ${entry.coats} coats`}
                  testId={`coat-rate-${rate.id}-${entry.coats}`}
                  value={entry.value}
                  onCommit={(value) => scope.setCoatRate(rate.id, entry.coats, value)}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

function CoatField({
  label,
  testId,
  value,
  onCommit,
}: {
  label: string
  testId: string
  value: number
  onCommit: (value: number) => void
}) {
  const [text, setText] = useState(String(value))
  useEffect(() => {
    setText(String(value))
  }, [value])
  return (
    <label className="grid w-28 gap-1 text-xs text-muted-foreground">
      {label.replace(/.*, /, "")}
      <Input
        aria-label={label}
        data-testid={testId}
        value={text}
        className="h-9"
        onValueChange={setText}
        onBlur={() => {
          const next = Number(text)
          if (!Number.isFinite(next) || next < 0) {
            setText(String(value))
            return
          }
          onCommit(next)
        }}
      />
    </label>
  )
}

function basisLabel(rate: ProductionRate): string {
  if (rate.basis === "sqft_per_hour") return "sq ft per hour"
  if (rate.basis === "lnft_per_hour") return "linear ft per hour"
  if (rate.basis === "hours_per_item") return "hours per item"
  return rate.basis.replaceAll("_", " ")
}

function trimRate(value: number): string {
  return String(Math.round(value * 1000) / 1000)
}
