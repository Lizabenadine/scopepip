import type { EstimateQuote, EstimateTotals } from "@/lib/estimate/calculate"
import { sectionByGroup } from "@/lib/estimate/groups"
import { hoursLabel, moneyExact } from "@/lib/format"
import type { AreaGroup, AreaInput, EstimateSettings } from "@/lib/types"

export function CalculationPanel({
  quote,
  totals,
  settings,
  areas,
  areaGroups,
  showCosts = true,
  showCharges = false,
}: {
  quote: EstimateQuote
  totals: EstimateTotals
  settings: EstimateSettings
  areas?: AreaInput[]
  areaGroups?: AreaGroup[]
  showCosts?: boolean
  showCharges?: boolean
}) {
  const paintingHours = Math.round(quote.areas.reduce((sum, area) => sum + area.allocatedHours, 0) * 1000) / 1000
  const groupIdOf = new Map((areas ?? []).map((area) => [area.id, area.groupId]))
  const sections = sectionByGroup(quote.areas, areaGroups, (area) => groupIdOf.get(area.id))
  const rows = [
    ["Labor", totals.labor],
    ["Materials", totals.materials],
    ["Additional charges", totals.additional],
    ["Discounts", totals.discount],
    ["Taxes", totals.tax],
    ["Deposit", totals.deposit],
    ["Remaining balance", totals.balance],
  ] as const
  return (
    <div className="flex flex-col gap-3 text-sm">
      {showCharges ? (
        <dl className="grid grid-cols-2 gap-2" data-testid="estimate-breakdown-sheet">
          {rows.map(([label, amount]) => (
            <div key={label}>
              <dt className="text-xs text-muted-foreground">{label}</dt>
              <dd className="tabular-nums">
                {label === "Discounts" && amount > 0 ? `−${moneyExact(amount)}` : moneyExact(amount)}
              </dd>
            </div>
          ))}
        </dl>
      ) : null}
      <p className="text-muted-foreground">
        Area and trim hours are the measurement divided by the time rate for that coat count. Item
        hours are the count times hours per item. Primer repeats its one-coat speed for each primer
        coat. Hours then round up
        to the nearest {settings.hourRounding === 0 ? "exact hour" : `${settings.hourRounding} hr`}.
        Coat counts go through six. A count past the rates on file keeps the highest one, then adds one coat of time for each coat after it.
        A typed square-foot, linear-foot, or hour amount on a surface replaces that part of the math.
        Typed hours are used as entered.
        {showCosts ? ` Labor is those hours times $${settings.hourlyRate}/hr. Materials are added on their own.` : " The price is the bid for this scope."}
      </p>
      {sections.map((section) => (
        <div key={section.groupId ?? "ungrouped"} className="flex flex-col gap-3">
          {section.groupName ? (
            <h3 className="text-xs font-semibold tracking-[0.14em] text-muted-foreground uppercase" data-testid="price-group">
              {section.groupName}
            </h3>
          ) : null}
          {section.items.map((area) => (
            <section key={area.id}>
              <h3 className="font-medium">{area.name}</h3>
              <div className="mt-1 grid grid-cols-[minmax(0,1.4fr)_auto_auto_auto] gap-x-3 gap-y-1 text-xs">
                <span className="text-muted-foreground">Surface</span>
                <span className="text-muted-foreground">Measure</span>
                <span className="text-muted-foreground">Time rate</span>
                <span className="text-right text-muted-foreground">Hours</span>
                {area.surfaces.map((surface) => (
                  <div key={surface.id} className="contents" data-testid={`priced-surface-${surface.internalLabel}`}>
                    <span>{surface.internalLabel}</span>
                    <span className="tabular-nums">
                      {surface.quantity} {surface.quantityUnit}
                    </span>
                    <span>{surface.rateLabel}</span>
                    <span className="text-right tabular-nums">{hoursLabel(surface.allocatedHours)}</span>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      ))}
      {showCosts ? (
        <p className="text-xs text-muted-foreground">
          {hoursLabel(paintingHours)} of area time at ${settings.hourlyRate}/hr.
          {settings.taxPercent > 0
            ? ` Tax is ${settings.taxBasis === "materials_only" ? "on materials" : "on the total job"}.`
            : ""}
        </p>
      ) : null}
      {quote.surcharge > 0 ? (
        <p className="text-xs text-muted-foreground">
          {quote.paymentMethodLabel} surcharge {moneyExact(quote.surcharge)}. Amount due{" "}
          {moneyExact(quote.amountDue)}.
        </p>
      ) : null}
    </div>
  )
}
