"use client"

import type { ReactNode } from "react"
import { Button } from "@/components/ui/button"
import type { EstimateQuote, EstimateTotals } from "@/lib/estimate/calculate"
import { gallonsLabel, hoursLabel, money, moneyExact } from "@/lib/format"

export function PriceSummary({
  quote,
  totals,
  saveLabel,
  disabled,
  disabledReason,
  nextLabel,
  status,
  onAdvance,
  onExplain,
  variant,
  details,
}: {
  quote: EstimateQuote
  totals: EstimateTotals
  saveLabel: string
  disabled: boolean
  disabledReason: string | null
  nextLabel: string | null
  status: string | null
  onAdvance: () => void
  onExplain: () => void
  variant: "dock" | "card"
  details?: ReactNode
}) {
  const rows = [
    ["Labor", totals.labor],
    ["Materials", totals.materials],
    ["Additional charges", totals.additional],
    ["Discounts", totals.discount],
    ["Taxes", totals.tax],
    ["Deposit", totals.deposit],
    ["Remaining balance", totals.balance],
  ] as const
  const body = (
    <>
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            Estimate
          </p>
          <p
            className="font-display text-4xl leading-none text-price tabular-nums"
            aria-live="polite"
          >
            {money(totals.total)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground" data-testid="estimate-summary">
            {hoursLabel(quote.allocatedHours)} · {gallonsLabel(quote.paintGallons)} · sales {money(quote.salesRate)}/hr
          </p>
        </div>
        <button
          type="button"
          onClick={onExplain}
          className="text-sm font-medium text-primary underline-offset-4 hover:underline lg:hidden"
        >
          How it prices
        </button>
      </div>
      <dl className="grid grid-cols-2 gap-x-3 gap-y-2 border-t border-border pt-3" data-testid="estimate-breakdown">
        {rows.map(([label, amount]) => (
          <div key={label}>
            <dt className="text-xs text-muted-foreground">{label}</dt>
            <dd className="tabular-nums" data-testid={`estimate-${label.toLowerCase().replace(/\s+/g, "-")}`}>
              {label === "Discounts" && amount > 0 ? `−${moneyExact(amount)}` : moneyExact(amount)}
            </dd>
          </div>
        ))}
      </dl>
      {disabledReason ? (
        <p className="text-xs text-muted-foreground">{disabledReason}</p>
      ) : null}
      {status ? <p className="text-xs font-medium text-primary">{status}</p> : null}
      <div className="flex gap-2">
        {nextLabel ? (
          <Button
            type="button"
            variant="outline"
            className="h-12 flex-1"
            disabled={disabled}
            onClick={onAdvance}
          >
            {nextLabel}
          </Button>
        ) : null}
        <Button type="submit" className="h-12 flex-1" disabled={disabled}>
          {saveLabel}
        </Button>
      </div>
    </>
  )

  if (variant === "dock") {
    return (
      <div className="fixed inset-x-0 bottom-16 z-20 border-t border-border bg-background px-4 py-2 md:bottom-0 lg:hidden">
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="font-display text-2xl leading-none text-price tabular-nums" aria-live="polite">
              {money(totals.total)}
            </p>
            <button type="button" onClick={onExplain} className="mt-1 block truncate text-xs font-medium text-primary">
              How it prices
            </button>
          </div>
          <div className="flex shrink-0 gap-2">
            {nextLabel ? (
              <Button type="button" variant="outline" className="h-11 px-3" disabled={disabled} onClick={onAdvance}>
                {nextLabel}
              </Button>
            ) : null}
            <Button type="submit" className="h-11 px-3" disabled={disabled}>
              {saveLabel}
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <aside className="sticky top-6 hidden max-h-[calc(100dvh-3rem)] flex-col gap-4 overflow-y-auto rounded-2xl bg-card p-4 border border-slate-200 bg-white shadow-sm lg:flex">
      {body}
      {details}
    </aside>
  )
}
