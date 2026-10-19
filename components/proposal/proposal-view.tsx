"use client"

import Link from "next/link"
import { CompanyName } from "@/components/brand/company-name"
import { displayCompanyName } from "@/lib/brand/company"
import { useScope } from "@/lib/data/store"
import { sectionByGroup } from "@/lib/estimate/groups"
import { hoursLabel, jobDate, money } from "@/lib/format"

export function ProposalView({ id }: { id: string }) {
  const scope = useScope()
  if (!scope.ready) {
    return <div className="h-40 animate-pulse rounded-2xl bg-muted" aria-hidden />
  }
  const estimate = scope.estimates.find((item) => item.id === id)
  if (!estimate) {
    return (
      <div className="rounded-2xl border border-dashed border-border px-4 py-10 text-center">
        <h1 className="text-xl font-semibold">This proposal isn&apos;t on this device</h1>
        <Link href="/" className="mt-4 inline-block text-sm font-medium text-primary">
          Back to jobs
        </Link>
      </div>
    )
  }
  const client = scope.clientById(estimate.clientId)
  const quote = scope.quoteEstimate(estimate)
  const sent = estimate.createdAt
  const expires =
    estimate.settings.expiryDays > 0
      ? new Date(new Date(sent).getTime() + estimate.settings.expiryDays * 86400000)
      : null

  return (
    <article className="mx-auto flex max-w-2xl flex-col gap-6 pb-8">
      <div className="flex items-center justify-between gap-3 text-sm">
        <Link href={`/estimates/${estimate.id}`} className="text-muted-foreground">
          Back to estimate
        </Link>
        <Link href={`/p/${estimate.publicToken}`} className="font-medium text-primary">
          Client link
        </Link>
        {estimate.acceptedAt ? <span className="font-medium">Accepted</span> : null}
      </div>
      <header>
        <CompanyName
          name={displayCompanyName(scope.estimateSettings.companyName)}
          className="text-sm font-semibold tracking-tight"
        />
        <p className="mt-2 text-xs font-semibold tracking-[0.14em] text-muted-foreground uppercase">
          Proposal
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">{estimate.title || "Estimate"}</h1>
        <p className="text-sm text-muted-foreground">{client?.name}</p>
        <p className="mt-2 text-sm">{estimate.jobAddress}</p>
        {expires ? (
          <p className="mt-1 text-sm text-muted-foreground">
            Expires {jobDate(expires.toISOString().slice(0, 10))}
          </p>
        ) : null}
      </header>
      {estimate.notes ? <p className="text-sm">{estimate.notes}</p> : null}
      {sectionByGroup(
        quote.areas.filter((area) => area.surfaces.some((surface) => !surface.hideFromCustomer)),
        estimate.areaGroups,
        (area) => estimate.areas.find((item) => item.id === area.id)?.groupId,
      ).map((section) => (
        <div key={section.groupId ?? "ungrouped"} className="flex flex-col gap-3">
          {section.groupName ? (
            <h2 className="text-xs font-semibold tracking-[0.14em] text-muted-foreground uppercase" data-testid="proposal-group">
              {section.groupName}
            </h2>
          ) : null}
          {section.items.map((area) => {
            const visible = area.surfaces.filter((surface) => !surface.hideFromCustomer)
            return (
              <section key={area.id} className="rounded-2xl bg-card p-4 ring-1 ring-foreground/10">
                <div className="flex items-baseline justify-between gap-3">
                  <h2 className="text-lg font-semibold">{area.name}</h2>
                  <p className="font-display text-2xl text-price tabular-nums">{money(area.clientPrice)}</p>
                </div>
                <p className="text-xs text-muted-foreground">
                  {area.areaType === "room"
                    ? `${area.lengthFt} × ${area.widthFt} × ${area.heightFt} ft`
                    : `${area.lengthFt} × ${area.heightFt} ft`}
                </p>
                <ul className="mt-3 flex flex-col gap-3">
                  {visible.map((surface) => (
                    <li key={surface.id}>
                      <div className="flex items-baseline justify-between gap-3">
                        <p className="font-medium">{surface.clientLabel}</p>
                        {surface.showPrice ? (
                          <p className="tabular-nums">{money(surface.price)}</p>
                        ) : null}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {surface.clientDescription}
                        {surface.showCoats ? ` · ${surface.coatCount} coats` : ""}
                      </p>
                    </li>
                  ))}
                </ul>
              </section>
            )
          })}
        </div>
      ))}
      {quote.lineItems.length > 0 ? (
        <section className="flex flex-col gap-2">
          <h2 className="text-xs font-semibold tracking-[0.14em] text-muted-foreground uppercase">
            Additional items
          </h2>
          {quote.lineItems.map((line) => (
            <div key={line.id} className="flex items-baseline justify-between gap-3 rounded-2xl bg-card px-4 py-3 ring-1 ring-foreground/10">
              <div>
                <p className="font-medium">{line.label}</p>
                {line.clientNote ? (
                  <p className="text-sm whitespace-pre-line text-muted-foreground">{line.clientNote}</p>
                ) : null}
              </div>
              <p className="tabular-nums">{money(line.price)}</p>
            </div>
          ))}
        </section>
      ) : null}
      <section className="rounded-2xl bg-card p-4 ring-1 ring-foreground/10">
        <Row label="Subtotal" value={money(quote.subtotal)} />
        {quote.discount > 0 ? <Row label="Discount" value={money(quote.discount)} /> : null}
        {quote.tax > 0 ? <Row label="Tax" value={money(quote.tax)} /> : null}
        <div className="mt-3 flex items-baseline justify-between border-t border-border pt-3">
          <p className="font-medium">Total</p>
          <p className="font-display text-3xl text-price tabular-nums">{money(quote.total)}</p>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          {hoursLabel(quote.allocatedHours)} · sales rate {money(quote.salesRate)} per hour
        </p>
        {quote.surcharge > 0 ? (
          <p className="mt-2 text-sm">
            {quote.paymentMethodLabel} adds {money(quote.surcharge)}. Amount due {money(quote.amountDue)}.
          </p>
        ) : (
          <p className="mt-2 text-sm">Pay by {quote.paymentMethodLabel.toLowerCase()}.</p>
        )}
      </section>
      <section>
        <h2 className="text-xs font-semibold tracking-[0.14em] text-muted-foreground uppercase">
          Payment methods
        </h2>
        <ul className="mt-2 flex flex-wrap gap-2">
          {scope.paymentMethods.map((method) => (
            <li
              key={method.id}
              className={
                method.id === estimate.settings.paymentMethodId
                  ? "rounded-full bg-primary px-3 py-1.5 text-sm text-primary-foreground"
                  : "rounded-full bg-muted px-3 py-1.5 text-sm"
              }
            >
              {method.label}
            </li>
          ))}
        </ul>
      </section>
      {!estimate.acceptedAt ? (
        <button
          type="button"
          className="h-12 rounded-lg bg-primary text-sm font-medium text-primary-foreground"
          onClick={() => scope.acceptEstimate(estimate.id)}
        >
          Accept estimate
        </button>
      ) : (
        <p className="text-sm font-medium">Signed and accepted.</p>
      )}
    </article>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3 py-1 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  )
}
