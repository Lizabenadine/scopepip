"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { buildHourlyRate } from "@/lib/estimate/hourly-rate"
import { moneyExact } from "@/lib/format"
import type { HourlyRateBuild } from "@/lib/types"

export function HourlyRateBuildButton({
  initial,
  onApply,
}: {
  initial?: HourlyRateBuild
  onApply: (hourlyRate: number, build: HourlyRateBuild) => void
}) {
  const [open, setOpen] = useState(false)
  const [labor, setLabor] = useState(fieldText(initial?.laborCostPerHour))
  const [overhead, setOverhead] = useState(fieldText(initial?.overheadPerHour))
  const [sundries, setSundries] = useState(fieldText(initial?.sundriesPerHour))
  const [profit, setProfit] = useState(fieldText(initial?.profitPercent))
  const build = readBuild(labor, overhead, sundries, profit)
  const built = buildHourlyRate(build)

  return (
    <>
      <button
        type="button"
        className="justify-self-start text-sm font-medium text-primary"
        data-testid="hourly-rate-build"
        onClick={() => setOpen(true)}
      >
        Build rate
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Build the hourly rate</DialogTitle>
            <DialogDescription>
              Labor, overhead, and paint per hour, plus the profit you want to keep from the selling rate.
            </DialogDescription>
          </DialogHeader>
          <RateField
            id="hourly-rate-labor"
            label="Labor cost per hour"
            hint="What you pay a painter, including taxes and benefits."
            value={labor}
            onValueChange={setLabor}
          />
          <RateField
            id="hourly-rate-overhead"
            label="Overhead per hour"
            hint="Rent, insurance, office, and owner pay spread across painter hours."
            value={overhead}
            onValueChange={setOverhead}
          />
          <RateField
            id="hourly-rate-sundries"
            label="Paint and sundries per hour"
            hint="Leave 0 when paint is priced on the estimate."
            value={sundries}
            onValueChange={setSundries}
          />
          <RateField
            id="hourly-rate-profit"
            label="Profit %"
            hint="The share of the selling rate you want to keep."
            value={profit}
            onValueChange={setProfit}
          />
          <p className="text-sm" data-testid="hourly-rate-result">
            {built.ok ? `Charge ${moneyExact(built.hourlyRate)} per hour.` : built.reason}
          </p>
          <DialogFooter>
            <Button
              type="button"
              className="h-11"
              data-testid="hourly-rate-apply"
              disabled={!built.ok}
              onClick={() => {
                if (!built.ok) return
                onApply(built.hourlyRate, build)
                setOpen(false)
              }}
            >
              Use this rate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

function RateField({
  id,
  label,
  hint,
  value,
  onValueChange,
}: {
  id: string
  label: string
  hint: string
  value: string
  onValueChange: (value: string) => void
}) {
  return (
    <div className="grid gap-1">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        data-testid={id}
        inputMode="decimal"
        value={value}
        className="h-11"
        onValueChange={(next) => onValueChange(next.replace(/[^0-9.]/g, "").replace(/(\..*)\./g, "$1"))}
      />
      <p className="text-xs text-muted-foreground">{hint}</p>
    </div>
  )
}

function fieldText(value: number | undefined): string {
  return value === undefined || value === 0 ? "" : String(value)
}

function readAmount(value: string): number {
  if (value.trim() === "" || value === ".") return 0
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : Number.NaN
}

function readBuild(labor: string, overhead: string, sundries: string, profit: string): HourlyRateBuild {
  return {
    laborCostPerHour: readAmount(labor),
    overheadPerHour: readAmount(overhead),
    sundriesPerHour: readAmount(sundries),
    profitPercent: readAmount(profit),
  }
}
