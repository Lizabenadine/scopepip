"use client"

import Link from "next/link"
import {
  ProposalCover,
  ProposalPager,
  ProposalPhotoPage,
  ProposalSignatureCopy,
  ProposalTermsPage,
  ProposalTestimonialPage,
  pageNumber,
} from "@/components/proposal/proposal-pages"
import { displayCompanyName } from "@/lib/brand/company"
import { useScope } from "@/lib/data/store"
import { sectionByGroup } from "@/lib/estimate/groups"
import { hoursLabel, jobDate, money } from "@/lib/format"
import { proposalDocument, proposalPageList } from "@/lib/proposals/document"

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
  const companyName = displayCompanyName(scope.estimateSettings.companyName)
  const pagesDocument = proposalDocument(scope.estimateSettings)
  const pages = proposalPageList(pagesDocument)
  const declined = estimate.clientStatus === "declined" || Boolean(estimate.declinedAt)

  return (
    <article className="mx-auto flex max-w-3xl flex-col gap-6 pb-8">
      <div className="flex items-center justify-between gap-3 text-sm">
        <Link href={`/estimates/${estimate.id}`} className="text-muted-foreground">
          Back to estimate
        </Link>
        <Link href={`/p/${estimate.publicToken}`} className="font-medium text-primary">
          Client link
        </Link>
        {estimate.acceptedAt ? <span className="font-medium">Accepted</span> : null}
        {declined ? <span className="font-medium">Declined</span> : null}
      </div>
      <ProposalPager pages={pages} />
      <ProposalCover
        companyName={companyName}
        clientName={client?.name || "Client"}
        title={estimate.title || "Estimate"}
        jobAddress={estimate.jobAddress}
        companyEmail={scope.estimateSettings.companyEmail?.trim() || ""}
        preparedOn={jobDate(sent.slice(0, 10))}
        expiresOn={expires ? jobDate(expires.toISOString().slice(0, 10)) : null}
        total={quote.total}
        coverLine={pagesDocument.coverLine}
        page={pageNumber(pages, "proposal-page-cover")}
        pageCount={pages.length}
      />
      {estimate.notes ? <p className="text-sm">{estimate.notes}</p> : null}
      <div id="proposal-page-scope" data-testid="proposal-page-scope" className="flex flex-col gap-3">
      {sectionByGroup(
        quote.areas.filter((area) => area.surfaces.length > 0),
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
      </div>
      {pagesDocument.photos.length > 0 ? (
        <ProposalPhotoPage
          photos={pagesDocument.photos}
          page={pageNumber(pages, "proposal-page-photos")}
          pageCount={pages.length}
        />
      ) : null}
      {pagesDocument.testimonials.length > 0 ? (
        <ProposalTestimonialPage
          testimonials={pagesDocument.testimonials}
          page={pageNumber(pages, "proposal-page-testimonials")}
          pageCount={pages.length}
        />
      ) : null}
      <ProposalTermsPage
        terms={pagesDocument.contractTerms}
        page={pageNumber(pages, "proposal-page-terms")}
        pageCount={pages.length}
      />
      <section id="proposal-page-sign" data-testid="proposal-page-sign" className="flex flex-col gap-4 rounded-2xl bg-card p-4 ring-1 ring-foreground/10">
        <h2 className="text-lg font-semibold">Signature</h2>
        <ProposalSignatureCopy
          acceptWording={pagesDocument.acceptWording}
          declineWording={pagesDocument.declineWording}
        />
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
      {!estimate.acceptedAt && !declined ? (
        <button
          type="button"
          className="h-12 rounded-lg bg-primary text-sm font-medium text-primary-foreground"
          onClick={() => scope.acceptEstimate(estimate.id)}
        >
          Accept estimate
        </button>
      ) : declined ? (
        <p className="text-sm font-medium">Declined.</p>
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
