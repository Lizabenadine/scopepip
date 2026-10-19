import type { EstimateQuote } from "@/lib/estimate/calculate"
import { sectionByGroup } from "@/lib/estimate/groups"
import { hoursLabel, money } from "@/lib/format"
import type { AreaGroup, AreaInput, EstimateSettings } from "@/lib/types"

export function CalculationPanel({
  quote,
  settings,
  areas,
  areaGroups,
}: {
  quote: EstimateQuote
  settings: EstimateSettings
  areas?: AreaInput[]
  areaGroups?: AreaGroup[]
}) {
  const paintingHours = Math.round(quote.areas.reduce((sum, area) => sum + area.allocatedHours, 0) * 1000) / 1000
  const groupIdOf = new Map((areas ?? []).map((area) => [area.id, area.groupId]))
  const sections = sectionByGroup(quote.areas, areaGroups, (area) => groupIdOf.get(area.id))
  return (
    <div className="flex flex-col gap-3 text-sm">
      <p className="text-muted-foreground">
        Area and trim hours are the measurement divided by the time rate for that coat count. Item
        hours are the count times hours per item. Primer repeats its one-coat speed for each primer
        coat. Hours then round up
        to the nearest {settings.hourRounding === 0 ? "exact hour" : `${settings.hourRounding} hr`}.
        Coat counts go through six. A count past the rates on file keeps the highest one, then adds one coat of time for each coat after it.
        A typed square-foot, linear-foot, or hour amount on a surface replaces that part of the math.
        Typed hours are used as entered. Labor is those hours times ${settings.hourlyRate}/hr.
        Materials are added on their own.
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
      <dl className="grid grid-cols-2 gap-2 border-t border-border pt-3">
        <div className="col-span-2">
          <dt className="text-xs text-muted-foreground">Labor</dt>
          <dd className="tabular-nums" data-testid="estimate-labor">
            {hoursLabel(paintingHours)} × ${settings.hourlyRate}/hr = {money(quote.laborPrice)}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Materials</dt>
          <dd className="tabular-nums">{money(quote.materialCost + quote.lineItemPrice)}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Discount</dt>
          <dd className="tabular-nums">{money(quote.discount)}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">
            Tax {settings.taxBasis === "materials_only" ? "on materials" : "on the total job"}
          </dt>
          <dd className="tabular-nums">{money(quote.tax)}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Sales rate</dt>
          <dd className="tabular-nums">{money(quote.salesRate)}/hr</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Total</dt>
          <dd className="font-display text-lg text-price tabular-nums">{money(quote.total)}</dd>
        </div>
      </dl>
      {quote.surcharge > 0 ? (
        <p className="text-xs text-muted-foreground">
          {quote.paymentMethodLabel} surcharge {money(quote.surcharge)}. Amount due{" "}
          {money(quote.amountDue)}.
        </p>
      ) : null}
    </div>
  )
}
