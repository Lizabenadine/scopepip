"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ONE_OFF_BASES, createOneOffRate } from "@/lib/estimate/one-off"
import type { EstimateKind, ProductionRate, RateBasis } from "@/lib/types"

export function OneOffRateForm({
  kind,
  onAdd,
}: {
  kind: EstimateKind
  onAdd: (rate: ProductionRate) => void
}) {
  const [open, setOpen] = useState(false)
  const [label, setLabel] = useState("")
  const [basis, setBasis] = useState<RateBasis>("sqft_per_hour")
  const [speed, setSpeed] = useState("")
  const [error, setError] = useState<string | null>(null)
  const speedLabel = ONE_OFF_BASES.find((item) => item.id === basis)?.speedLabel ?? "Speed"

  const add = () => {
    const rate = createOneOffRate({ label, basis, speed: Number(speed), kind })
    if (!rate) {
      setError("Name the rate and enter a speed above zero.")
      return
    }
    onAdd(rate)
    setLabel("")
    setSpeed("")
    setError(null)
    setOpen(false)
  }

  if (!open) {
    return (
      <button
        type="button"
        className="text-sm font-medium text-primary"
        data-testid="one-off-open"
        onClick={() => setOpen(true)}
      >
        One-off rate
      </button>
    )
  }

  return (
    <div className="mt-2 grid gap-2 rounded-xl bg-muted/40 p-3" data-testid="one-off-form">
      <p className="text-xs font-semibold tracking-[0.14em] text-muted-foreground uppercase">This job only</p>
      <div className="grid gap-1">
        <Label htmlFor="one-off-name">Name</Label>
        <Input
          id="one-off-name"
          data-testid="one-off-name"
          value={label}
          placeholder="Beadboard, brick, stain"
          className="h-10"
          onValueChange={(value) => {
            setLabel(value)
            setError(null)
          }}
        />
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        <div className="grid gap-1">
          <Label htmlFor="one-off-basis">Measured by</Label>
          <select
            id="one-off-basis"
            data-testid="one-off-basis"
            className="h-10 rounded-lg border border-input bg-transparent px-2 text-sm"
            value={basis}
            onChange={(event) => setBasis(event.target.value as RateBasis)}
          >
            {ONE_OFF_BASES.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
        </div>
        <div className="grid gap-1">
          <Label htmlFor="one-off-speed">{speedLabel}</Label>
          <Input
            id="one-off-speed"
            data-testid="one-off-speed"
            inputMode="decimal"
            value={speed}
            className="h-10"
            onValueChange={(value) => {
              setSpeed(value.replace(/[^0-9.]/g, ""))
              setError(null)
            }}
          />
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        This rate prices the room and stays on this estimate. It does not join the company rate book.
      </p>
      {error ? (
        <p className="text-sm text-destructive" data-testid="one-off-error">
          {error}
        </p>
      ) : null}
      <div className="flex gap-3">
        <button type="button" className="text-sm font-medium text-primary" data-testid="one-off-add" onClick={add}>
          Add rate
        </button>
        <button
          type="button"
          className="text-sm text-muted-foreground"
          onClick={() => {
            setOpen(false)
            setError(null)
          }}
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
