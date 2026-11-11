"use client"

import type { ReactNode } from "react"
import { Button } from "@/components/ui/button"
import { estimateCharges, hasMissingMaterialPricing, type EstimateQuote } from "@/lib/estimate/calculate"
import { gallonsLabel, hoursLabel, money, moneyExact } from "@/lib/format"
import { balanceAfterDeposit, depositAmount } from "@/lib/payments/deposit"

export function PriceSummary({
  quote,
  saveLabel,
  disabled,
  disabledReason,
  advanceDisabled,
  excludeMaterials,
  nextLabel,
  status,
  onAdvance,
  onExplain,
  variant,
  details,
  depositPercent,
}: {
  quote: EstimateQuote
  saveLabel: string
  disabled: boolean
  disabledReason: string | null
  advanceDisabled?: boolean
  excludeMaterials?: boolean
  nextLabel: string | null
  status: string | null
  onAdvance: () => void
  onExplain: () => void
  variant: "dock" | "card"
  details?: ReactNode
  depositPercent: number
}) {
  const charges = estimateCharges(quote)
  const missingMaterials = !excludeMaterials && hasMissingMaterialPricing(quote)
  const rows: Array<[string, number | string]> = [
    ["Labor", charges.labor],
    ["Estimated paint", gallonsLabel(quote.paintGallons)],
    ["Materials", charges.materials],
    ["Additional charges", charges.additional],
    ["Discounts", charges.discount],
    ["Taxes", charges.tax],
    ["Deposit", depositAmount(quote.total, depositPercent)],
    ["Remaining balance", balanceAfterDeposit(quote.total, depositPercent)],
  ]
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
          {missingMaterials ? (
            <p className="mt-1 text-xs font-medium text-amber-600 dark:text-amber-400" data-testid="materials-excluded-warning">
              Total excludes unpriced materials. Configure paint price/gal before sending.
            </p>
          ) : excludeMaterials ? (
            <p className="mt-1 text-xs text-muted-foreground" data-testid="materials-excluded-note">
              Paint materials excluded
            </p>
          ) : null}
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
              {label === "Estimated paint" ? (
                amount
              ) : label === "Materials" && excludeMaterials ? (
                typeof amount === "number" && amount > 0 ? (
                  <span>
                    {moneyExact(amount)}{" "}
                    <span className="text-xs text-muted-foreground">(paint excluded)</span>
                  </span>
                ) : (
                  <span className="text-xs text-muted-foreground">Paint materials excluded</span>
                )
              ) : label === "Materials" && missingMaterials && amount === 0 && quote.paintGallons > 0 ? (
                <span className="text-xs font-medium text-amber-600 dark:text-amber-400">Price not configured</span>
              ) : label === "Materials" && missingMaterials && typeof amount === "number" ? (
                <span>
                  {moneyExact(amount)}{" "}
                  <span className="text-xs font-medium text-amber-600 dark:text-amber-400">(partial)</span>
                </span>
              ) : label === "Discounts" && typeof amount === "number" && amount > 0 ? (
                `−${moneyExact(amount)}`
              ) : typeof amount === "number" ? (
                moneyExact(amount)
              ) : (
                amount
              )}
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
            disabled={disabled || advanceDisabled}
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
              {money(quote.total)}
            </p>
            {missingMaterials ? (
              <p className="mt-0.5 truncate text-xs font-medium text-amber-600 dark:text-amber-400">
                Excludes unpriced materials
              </p>
            ) : excludeMaterials ? (
              <p className="mt-0.5 truncate text-xs text-muted-foreground" data-testid="dock-materials-excluded-note">
                Paint materials excluded
              </p>
            ) : null}
            <button type="button" onClick={onExplain} className="mt-1 block truncate text-xs font-medium text-primary">
              How it prices
            </button>
          </div>
          <div className="flex shrink-0 gap-2">
            {nextLabel ? (
              <Button type="button" variant="outline" className="h-11 px-3" disabled={disabled || advanceDisabled} onClick={onAdvance}>
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
