"use client"

import type { ReactNode } from "react"
import { Button } from "@/components/ui/button"
import type { EstimateQuote } from "@/lib/estimate/calculate"
import { gallonsLabel, hoursLabel, money } from "@/lib/format"

export function PriceSummary({
  quote,
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
            {money(quote.total)}
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
      <div className="fixed inset-x-0 bottom-16 z-20 flex flex-col gap-2 border-t border-border bg-background/95 px-4 py-3 backdrop-blur md:bottom-0 lg:hidden">
        {body}
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
