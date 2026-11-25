"use client"

import Link from "next/link"
import { CheckCircle2, Download, FileCheck2, Briefcase } from "lucide-react"
import {
  ProposalCover,
  ProposalPager,
  ProposalPhotoPage,
  ProposalSignatureCopy,
  ProposalTemplateSections,
  ProposalTermsPage,
  ProposalTestimonialPage,
  pageNumber,
} from "@/components/proposal/proposal-pages"
import { displayCompanyName } from "@/lib/brand/company"
import { usePageOrigin } from "@/lib/browser/client-env"
import { useFieldLanguage } from "@/hooks/use-field-language"
import { officeLabel } from "@/lib/office/dashboard-copy"
import { translatePainting, paintingText } from "@/lib/field/terms"
import { useScope } from "@/lib/data/store"
import { sectionByGroup } from "@/lib/estimate/groups"
import { jobDate, money } from "@/lib/format"
import {
  paintMaterialsInclusionLabel,
  proposalDocument,
  proposalPageList,
  scheduledProductsFromAreas,
} from "@/lib/proposals/document"
import { balanceAfterDeposit, clampDepositPercent, depositAmount } from "@/lib/payments/deposit"
import { ProposalLinePhoto } from "@/components/proposal/line-photo"
import { ProposalLineVideo } from "@/components/proposal/line-video"
import { ProposalEmail } from "@/components/proposal/proposal-email"
import { OfficeProposalChat } from "@/components/proposal/proposal-chat"
import { ClientWorkOrder } from "@/components/proposal/client-work-order"
import { MultiTradeProposalSections } from "@/components/proposal/multi-trade-proposal-sections"
import { proposalFigures } from "@/lib/proposals/figures"
import { activeTrades } from "@/lib/estimate/multi-trade"

export function ProposalView({ id }: { id: string }) {
  const scope = useScope()
  const { language } = useFieldLanguage()
  const say = (text: string) => translatePainting(text, language)
  const label = (text: string) => officeLabel(text, language)
  const origin = usePageOrigin()
  const publicToken = scope.ready ? scope.estimates.find((item) => item.id === id)?.publicToken ?? "" : ""
  const spanishLink = origin && publicToken ? `${origin}/p/${publicToken}?lang=es` : ""
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
  const figures = proposalFigures(estimate, scope.paymentMethods, [])
  const quote = figures.quote
  const sent = estimate.createdAt
  const expires =
    estimate.settings.expiryDays > 0
      ? new Date(new Date(sent).getTime() + estimate.settings.expiryDays * 86400000)
      : null
  const companyName = displayCompanyName(scope.estimateSettings.companyName)
  const trades = activeTrades(estimate)
  const effectiveTrade = trades.length > 1 ? "multi-trade" : trades[0]
  const pagesDocument = proposalDocument(scope.estimateSettings, estimate.estimateKind, effectiveTrade)
  const pages = proposalPageList(pagesDocument)
  const scheduledProducts = scheduledProductsFromAreas(quote.areas)
  const declined = estimate.clientStatus === "declined" || Boolean(estimate.declinedAt)
  const depositPercent = clampDepositPercent(estimate.settings.depositPercent)
  const deposit = depositAmount(quote.total, depositPercent)
  const rawBrandColor = scope.estimateSettings.brandColor?.trim() || estimate.settings.brandColor?.trim() || ""
  const brandColor = /^#[0-9a-fA-F]{6}$/.test(rawBrandColor) ? rawBrandColor : undefined

  return (
    <article
      className="mx-auto flex max-w-3xl flex-col gap-6 pb-8"
      style={brandColor ? ({ "--primary": brandColor } as React.CSSProperties) : undefined}
    >
      <div className="flex items-center justify-between gap-3 text-sm">
        <Link href={`/estimates/${estimate.id}`} className="text-muted-foreground">
          Back to estimate
        </Link>
        <Link href={`/p/${estimate.publicToken}`} className="font-medium text-primary">
          Client link
        </Link>
        <button type="button" className="font-medium text-primary" onClick={() => window.print()}>
          Print
        </button>
        <a
          href={`/api/proposals/${estimate.id}/pdf`}
          download={`proposal-${estimate.id}.pdf`}
          data-testid="download-proposal-pdf"
          className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
        >
          <Download className="size-3.5" />
          <span>Download PDF</span>
        </a>
        <ProposalEmail
          estimateId={estimate.id}
          hasEmail={Boolean(client?.email.includes("@"))}
          clientEmail={client?.email}
        />
        <button
          type="button"
          data-testid="copy-spanish-proposal"
          className="font-medium text-primary"
          onClick={() => {
            if (spanishLink) void navigator.clipboard.writeText(spanishLink)
          }}
        >
          {label("Copy Spanish link")}
        </button>
        {estimate.acceptedAt || estimate.clientStatus === "accepted" || estimate.signature ? (
          <>
            <span className="inline-flex items-center gap-1 font-semibold text-emerald-700">
              <CheckCircle2 className="size-3.5" />
              <span>Signed & Accepted</span>
            </span>
            <Link
              href={`/work-orders/${estimate.id}`}
              data-testid="proposal-work-order-link"
              className="inline-flex items-center gap-1 font-medium text-emerald-700 hover:underline"
            >
              <Briefcase className="size-3.5" />
              <span>Work Order</span>
            </Link>
          </>
        ) : null}
        {declined ? <span className="font-medium text-amber-700">Declined</span> : null}
      </div>
      {spanishLink ? (
        <p className="text-sm text-muted-foreground" data-testid="spanish-proposal-link">
          {spanishLink}
        </p>
      ) : null}
      <ProposalPager pages={pages} />
      <ProposalCover
        companyName={companyName}
        logoUrl={scope.estimateSettings.logoUrl}
        clientName={client?.name || "Client"}
        title={estimate.title || "Estimate"}
        jobAddress={estimate.jobAddress}
        companyEmail={scope.estimateSettings.companyEmail?.trim() || ""}
        companyPhone={scope.estimateSettings.businessPhone?.trim() || ""}
        companyLicense={scope.estimateSettings.companyLicense?.trim() || ""}
        preparedOn={jobDate(sent.slice(0, 10))}
        expiresOn={expires ? jobDate(expires.toISOString().slice(0, 10)) : null}
        total={quote.total}
        coverLine={pagesDocument.coverLine}
        templateLabel={pagesDocument.template.label}
        page={pageNumber(pages, "proposal-page-cover")}
        pageCount={pages.length}
      />
      {estimate.notes ? <p className="text-sm">{paintingText(estimate.notes, estimate.notesEs, language)}</p> : null}
      <div id="proposal-page-scope" data-testid="proposal-page-scope" className="flex flex-col gap-4">
      <MultiTradeProposalSections estimate={estimate} multiTradeQuote={figures.multiTradeQuote} />
      {quote.areas.some((area) => area.surfaces.length > 0) && (
        <ClientWorkOrder
          companyName={companyName}
          logoUrl={scope.estimateSettings.logoUrl}
          clientName={client?.name || "Client"}
          jobAddress={estimate.jobAddress}
          orderNumber={estimate.id.replace(/^est-/i, "").replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toUpperCase()}
          templateLabel={pagesDocument.template.label}
          scopeOverview={pagesDocument.template.scopeOverview}
          sections={sectionByGroup(
            quote.areas.filter((area) => area.surfaces.length > 0),
            estimate.areaGroups,
            (area) => estimate.areas.find((item) => item.id === area.id)?.groupId,
          )}
        />
      )}
      {quote.lineItems.length > 0 ? (
        <section className="flex flex-col gap-2">
          <h2 className="text-xs font-semibold tracking-[0.14em] text-muted-foreground uppercase">
            {say("Additional items")}
          </h2>
          {quote.lineItems.map((line) => (
            <div key={line.id} className="flex items-start justify-between gap-3 rounded-2xl bg-card px-4 py-3 border border-slate-200 bg-white shadow-sm">
              <div className="min-w-0">
                <ProposalLinePhoto src={line.photo} alt={paintingText(line.label, line.labelEs, language)} />
                <ProposalLineVideo src={line.video} label={paintingText(line.label, line.labelEs, language)} />
                <p className="font-medium">{paintingText(line.label, line.labelEs, language)}</p>
                {line.clientNote ? (
                  <p className="text-sm whitespace-pre-line text-muted-foreground">{paintingText(line.clientNote, line.clientNoteEs, language)}</p>
                ) : null}
              </div>
              <p className="tabular-nums">{money(line.price)}</p>
            </div>
          ))}
        </section>
      ) : null}
      <ProposalTemplateSections
        template={pagesDocument.template}
        scheduledProducts={scheduledProducts}
        excludeMaterials={estimate.settings.excludeMaterials}
        language={language}
      />
      <section className="rounded-2xl bg-card p-4 border border-slate-200 bg-white shadow-sm">
        <Row label="Subtotal" value={money(quote.subtotal)} />
        {quote.discount > 0 ? <Row label="Discount" value={money(quote.discount)} /> : null}
        {quote.tax > 0 ? <Row label="Tax" value={money(quote.tax)} /> : null}
        <div className="mt-3 flex items-baseline justify-between border-t border-border pt-3">
          <p className="font-medium">Total</p>
          <p className="font-display text-3xl text-primary tabular-nums">{money(quote.total)}</p>
        </div>
        <p className="mt-1 text-xs font-medium text-muted-foreground" data-testid="proposal-materials-status-summary">
          {paintMaterialsInclusionLabel(estimate.settings.excludeMaterials, language).badge}
        </p>
        <div className="mt-2 flex items-baseline justify-between">
          <p className="text-sm text-muted-foreground">Deposit required ({depositPercent}%)</p>
          <p className="text-lg font-semibold tabular-nums">{money(deposit)}</p>
        </div>
        {deposit > 0 && deposit < quote.total ? (
          <div className="mt-2 flex items-baseline justify-between">
            <p className="text-sm text-muted-foreground">Balance after the job</p>
            <p data-testid="proposal-balance" className="text-lg font-semibold tabular-nums">
              {money(balanceAfterDeposit(quote.total, depositPercent))}
            </p>
          </div>
        ) : null}
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
      <OfficeProposalChat
        estimateId={estimate.id}
        messages={estimate.proposalMessages ?? []}
        customerName={client?.name || "Client"}
      />
      <section id="proposal-page-sign" data-testid="proposal-page-sign" className="flex flex-col gap-4 rounded-2xl bg-card p-4 border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Signature</h2>
          {estimate.signature || estimate.acceptedAt ? (
            <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
              <CheckCircle2 className="size-3.5" /> Signed & Accepted
            </span>
          ) : null}
        </div>
        {estimate.signature ? (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-4">
            <p className="font-display text-2xl font-bold text-slate-900">{estimate.signature.signedName}</p>
            {estimate.signature.signaturePayload?.startsWith("data:") ? (
              <div
                role="img"
                aria-label={`Signature of ${estimate.signature.signedName}`}
                className="my-2 h-20 w-full max-w-sm rounded-lg bg-white bg-contain bg-center bg-no-repeat border border-slate-200"
                style={{ backgroundImage: `url("${estimate.signature.signaturePayload}")` }}
              />
            ) : null}
            <p className="text-xs text-slate-600 mt-1">
              Signed by {estimate.signature.signedName} on {new Date(estimate.signature.signedAt).toLocaleDateString()}
            </p>
          </div>
        ) : null}
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
