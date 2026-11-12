"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { CheckCircle2, CreditCard, Download, Mail, Phone, Printer } from "lucide-react"
import { ProposalEngagement } from "@/components/proposal/proposal-engagement"
import { ProposalChat } from "@/components/proposal/proposal-chat"
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
import { SignaturePad } from "@/components/proposal/signature-pad"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { displayCompanyName } from "@/lib/brand/company"
import { readProposalCompanyName } from "@/lib/brand/profile"
import { calculateEstimate } from "@/lib/estimate/calculate"
import { ensureSubstrateRates } from "@/lib/estimate/substrate"
import { sectionByGroup } from "@/lib/estimate/groups"
import type { Estimate, EstimateSettings, PaymentMethod } from "@/lib/types"
import { jobDate, money, moneyExact } from "@/lib/format"
import { financingTerms, monthlyPayment } from "@/lib/financing/offer"
import {
  paintMaterialsInclusionLabel,
  proposalDocument,
  proposalPageList,
  scheduledProductsFromAreas,
} from "@/lib/proposals/document"
import { ProposalLinePhoto } from "@/components/proposal/line-photo"
import { ProposalLineVideo } from "@/components/proposal/line-video"
import { proposalFigures } from "@/lib/proposals/figures"
import { balanceAfterDeposit } from "@/lib/payments/deposit"
import { useFieldLanguage } from "@/hooks/use-field-language"
import { writeFieldLanguage, type FieldLanguage } from "@/lib/field/language"
import { translatePainting, paintingText } from "@/lib/field/terms"
import { FieldLanguageSwitch } from "@/components/field/language-switch"
import { ClientWorkOrder } from "@/components/proposal/client-work-order"

interface ProposalPayload {
  estimate: Estimate
  clientName: string
  clientLanguage?: "en" | "es"
  companyName: string
  companyEmail: string
  paymentMethods: PaymentMethod[]
  estimateSettings: EstimateSettings
}

export function PublicProposal({
  token,
  initialLanguage = null,
}: {
  token: string
  initialLanguage?: FieldLanguage | null
}) {
  const [view, setView] = useState<ProposalPayload | null>(null)
  const [missing, setMissing] = useState(false)
  const [selectedIds, setSelectedIds] = useState<string[] | null>(null)
  const [signedName, setSignedName] = useState("")
  const [signaturePayload, setSignaturePayload] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [profileName, setProfileName] = useState<string | null>(null)

  useEffect(() => {
    const chosen = initialLanguage ?? (view?.clientLanguage === "es" ? "es" : null)
    if (!chosen) return
    writeFieldLanguage(chosen)
    if (!initialLanguage) return
    void fetch(`/api/public/proposals/${encodeURIComponent(token)}/language`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ language: chosen }),
    }).catch(() => undefined)
  }, [initialLanguage, token, view?.clientLanguage])

  useEffect(() => {
    let cancelled = false
    void fetch(`/api/public/proposals/${encodeURIComponent(token)}`)
      .then(async (response) => {
        if (!response.ok) {
          if (!cancelled) setMissing(true)
          return
        }
        const payload = (await response.json()) as ProposalPayload
        if (!cancelled) setView(payload)
      })
      .catch(() => {
        if (!cancelled) setMissing(true)
      })
    void readProposalCompanyName(token).then((name) => {
      if (!cancelled) setProfileName(name)
    })
    return () => {
      cancelled = true
    }
  }, [token])

  useEffect(() => {
    const timer = window.setInterval(() => {
      void fetch(`/api/public/proposals/${encodeURIComponent(token)}/messages`)
        .then(async (response) => {
          if (!response.ok) return
          const payload = (await response.json()) as { messages?: Estimate["proposalMessages"] }
          if (!payload.messages) return
          setView((current) =>
            current ? { ...current, estimate: { ...current.estimate, proposalMessages: payload.messages } } : current,
          )
        })
        .catch(() => undefined)
    }, 8000)
    return () => window.clearInterval(timer)
  }, [token])

  if (!view && !missing) {
    return <div className="h-40 animate-pulse rounded-2xl bg-muted" aria-hidden />
  }

  if (!view) {
    return (
      <div className="rounded-2xl border border-dashed border-border px-4 py-12 text-center">
        <h1 className="text-xl font-semibold">This proposal link is not valid</h1>
        <p className="mt-2 text-sm text-muted-foreground">Ask your painter for a new link.</p>
      </div>
    )
  }

  return (
    <ProposalDocument
      token={token}
      estimate={view.estimate}
      clientName={view.clientName}
      companyName={displayCompanyName(profileName?.trim() || view.companyName)}
      companyEmail={view.companyEmail}
      estimateSettings={view.estimateSettings}
      financing={financingTerms(view.estimateSettings)}
      paymentMethods={view.paymentMethods}
      selectedIds={selectedIds}
      signedName={signedName}
      signaturePayload={signaturePayload}
      error={error}
      onSelectedIds={setSelectedIds}
      onSignedName={setSignedName}
      onSignature={setSignaturePayload}
      onError={setError}
      onLanguage={(language) => {
        void fetch(`/api/public/proposals/${encodeURIComponent(token)}/language`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ language }),
        }).catch(() => undefined)
      }}
      onSendMessage={async (body) => {
        const response = await fetch(`/api/public/proposals/${encodeURIComponent(token)}/messages`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ body }),
        })
        const result = (await response.json()) as { ok?: boolean; reason?: string; messages?: Estimate["proposalMessages"] }
        if (!response.ok || !result.ok || !result.messages) {
          return { ok: false as const, reason: result.reason || "The message could not be saved. Try again." }
        }
        setView((current) =>
          current ? { ...current, estimate: { ...current.estimate, proposalMessages: result.messages } } : current,
        )
        return { ok: true as const }
      }}
      onDecline={async () => {
        const response = await fetch(`/api/public/proposals/${encodeURIComponent(token)}/decline`, { method: "POST" })
        const result = (await response.json()) as { ok?: boolean; reason?: string; estimate?: Estimate }
        if (!response.ok || !result.ok || !result.estimate) {
          return { ok: false as const, reason: result.reason || "This proposal could not be declined." }
        }
        setView({ ...view, estimate: result.estimate })
        return { ok: true as const }
      }}
      onAccept={async (input) => {
        const response = await fetch(`/api/public/proposals/${encodeURIComponent(token)}/accept`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(input),
        })
        const result = (await response.json()) as { ok?: boolean; reason?: string; estimate?: Estimate }
        if (!response.ok || !result.ok || !result.estimate) {
          return { ok: false as const, reason: result.reason || "This proposal could not be accepted." }
        }
        setView({ ...view, estimate: result.estimate })
        return { ok: true as const }
      }}
    />
  )
}

export function ProposalDocument({
  token,
  estimate,
  clientName,
  companyName,
  companyEmail,
  estimateSettings,
  financing,
  paymentMethods,
  selectedIds,
  signedName,
  signaturePayload,
  error,
  onSelectedIds,
  onSignedName,
  onSignature,
  onError,
  onLanguage,
  onAccept,
  onDecline,
  onSendMessage,
}: {
  token?: string
  estimate: Estimate
  clientName: string
  companyName: string
  companyEmail: string
  estimateSettings: EstimateSettings
  financing: { enabled: boolean; aprPercent: number; months: number; lender: string; applyUrl: string }
  paymentMethods: { id: string; label: string; surchargePercent: number }[]
  selectedIds: string[] | null
  signedName: string
  signaturePayload: string
  error: string | null
  onSelectedIds: (ids: string[]) => void
  onSignedName: (name: string) => void
  onSignature: (payload: string) => void
  onError: (message: string | null) => void
  onLanguage: (language: FieldLanguage) => void
  onAccept: (input: { signedName: string; signaturePayload: string; selectedLineIds: string[] }) => Promise<
    { ok: true } | { ok: false; reason: string }
  >
  onDecline: () => Promise<{ ok: true } | { ok: false; reason: string }>
  onSendMessage: (body: string) => Promise<{ ok: true } | { ok: false; reason: string }>
}) {
  const { language } = useFieldLanguage()
  const say = (text: string) => translatePainting(text, language)
  const accepted = estimate.clientStatus === "accepted" && estimate.signature
  const optionalLines = estimate.lineItems.filter((item) => item.optional && item.pending !== true)
  const chosen =
    selectedIds ??
    (accepted
      ? estimate.signature!.selectedLineIds
      : optionalLines.filter((item) => item.selected !== false).map((item) => item.id))
  const figures = proposalFigures(estimate, paymentMethods, chosen)
  const quote = figures.quote
  const catalog = calculateEstimate({
    areas: estimate.areas,
    lineItems: estimate.lineItems.map((item) => ({ ...item, selected: true })),
    rates: ensureSubstrateRates(estimate.rates),
    settings: estimate.settings,
    paymentMethods,
  })
  const expires =
    estimate.settings.expiryDays > 0
      ? new Date(new Date(estimate.createdAt).getTime() + estimate.settings.expiryDays * 86400000)
      : null
  const pagesDocument = proposalDocument(estimateSettings, estimate.estimateKind)
  const pages = proposalPageList(pagesDocument)
  const scheduledProducts = scheduledProductsFromAreas(quote.areas)
  const declined = estimate.clientStatus === "declined" || Boolean(estimate.declinedAt)
  const [confirmDecline, setConfirmDecline] = useState(false)
  const [accepting, setAccepting] = useState(false)
  const preparedOn = jobDate(estimate.createdAt.slice(0, 10))
  const expiresOn = expires ? jobDate(expires.toISOString().slice(0, 10)) : null
  const proposalToken = token || estimate.publicToken
  const pdfHref = `/api/public/proposals/${encodeURIComponent(proposalToken)}/pdf`
  const payHref = `/p/${encodeURIComponent(proposalToken)}/pay`
  const companyPhone = estimateSettings.businessPhone?.trim() || ""

  const toggle = (id: string) => {
    if (accepted) return
    const next = chosen.includes(id) ? chosen.filter((item) => item !== id) : [...chosen, id]
    onSelectedIds(next)
  }

  const submit = (event: React.FormEvent) => {
    event.preventDefault()
    if (accepting) return
    setAccepting(true)
    const payload = signaturePayload || (signedName.trim() ? `typed:${signedName.trim()}` : "")
    void onAccept({
      signedName,
      signaturePayload: payload,
      selectedLineIds: chosen,
    }).then((result) => {
      setAccepting(false)
      onError(result.ok ? null : result.reason)
      if (result.ok && typeof window !== "undefined") {
        window.requestAnimationFrame(() => {
          document.getElementById("proposal-confirmation")?.scrollIntoView({ behavior: "smooth", block: "start" })
        })
      }
    })
  }

  const decline = () => {
    void onDecline().then((result) => {
      if (!result.ok) onError(result.reason)
    })
  }

  const rawBrandColor = estimateSettings.brandColor?.trim() || estimate.settings.brandColor?.trim() || ""
  const brandColor = /^#[0-9a-fA-F]{6}$/.test(rawBrandColor) ? rawBrandColor : undefined

  return (
    <article
      className="flex flex-col gap-8"
      style={brandColor ? ({ "--primary": brandColor } as React.CSSProperties) : undefined}
    >
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div className="flex flex-wrap items-center gap-3">
          <a
            href={pdfHref}
            download="proposal.pdf"
            data-testid="download-proposal-pdf"
            className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-primary shadow-sm hover:bg-slate-50"
          >
            <Download className="size-4" aria-hidden="true" />
            <span>{accepted ? "Download signed PDF" : "Download PDF"}</span>
          </a>
          <button
            type="button"
            className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-primary shadow-sm hover:bg-slate-50"
            onClick={() => window.print()}
          >
            <Printer className="size-4" aria-hidden="true" />
            <span>Print</span>
          </button>
        </div>
        <FieldLanguageSwitch onChange={onLanguage} />
      </div>
      {accepted && estimate.signature ? (
        <section
          id="proposal-confirmation"
          data-testid="proposal-signed-confirmation"
          className="flex flex-col gap-4 rounded-2xl border border-emerald-200 bg-emerald-50/70 p-5 shadow-sm print:hidden sm:p-6"
        >
          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 size-6 shrink-0 text-emerald-700" aria-hidden="true" />
            <div className="min-w-0">
              <p className="text-xs font-semibold tracking-[0.14em] text-emerald-800 uppercase">
                Proposal Accepted &amp; Signed
              </p>
              <h2 className="mt-1 font-display text-2xl tracking-tight text-slate-950">
                Thank you, {estimate.signature.signedName}
              </h2>
              <p className="mt-1 text-sm text-slate-700">
                Signed on {signedLabel(estimate.signature.signedAt)} · Approved total{" "}
                <span className="font-semibold tabular-nums">{money(quote.total)}</span>
              </p>
            </div>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            {estimate.paymentStatus === "paid" ? (
              <Link
                href={payHref}
                data-testid="confirmation-payment-link"
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-emerald-300 bg-white px-4 text-sm font-medium text-emerald-900"
              >
                <CreditCard className="size-4" aria-hidden="true" />
                <span>{say("Paid")} · View receipt</span>
              </Link>
            ) : estimate.paymentStatus === "deposit_paid" ? (
              <Link
                href={payHref}
                data-testid="confirmation-payment-link"
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-emerald-300 bg-white px-4 text-sm font-medium text-emerald-900"
              >
                <CreditCard className="size-4" aria-hidden="true" />
                <span>{say("Deposit Paid / Scheduled")} · View details</span>
              </Link>
            ) : figures.deposit > 0 ? (
              <Link
                href={payHref}
                data-testid="confirmation-pay-deposit"
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground shadow-sm"
              >
                <CreditCard className="size-4" aria-hidden="true" />
                <span>{say("Pay deposit")} · {money(figures.deposit)}</span>
              </Link>
            ) : (
              <Link
                href={payHref}
                data-testid="confirmation-payment-link"
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-slate-800"
              >
                <CreditCard className="size-4" aria-hidden="true" />
                <span>View payment information</span>
              </Link>
            )}
            <a
              href={pdfHref}
              download="proposal.pdf"
              data-testid="confirmation-download-pdf"
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-slate-900 hover:bg-slate-50"
            >
              <Download className="size-4" aria-hidden="true" />
              <span>Download signed PDF</span>
            </a>
            <a
              href="#proposal-questions"
              className="inline-flex min-h-11 items-center justify-center rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Questions? Contact Your Contractor
            </a>
          </div>
        </section>
      ) : null}
      <ProposalEngagement proposalId={estimate.publicToken} />
      <ProposalPager pages={pages} />
      <ProposalCover
        companyName={companyName}
        logoUrl={estimateSettings.logoUrl}
        clientName={clientName}
        title={estimate.title}
        jobAddress={estimate.jobAddress}
        companyEmail={companyEmail}
        companyPhone={estimateSettings.businessPhone?.trim() || ""}
        companyLicense={estimateSettings.companyLicense?.trim() || ""}
        preparedOn={preparedOn}
        expiresOn={expiresOn}
        total={quote.total}
        coverLine={pagesDocument.coverLine}
        templateLabel={pagesDocument.template.label}
        page={pageNumber(pages, "proposal-page-cover")}
        pageCount={pages.length}
      />

      {estimate.notes ? <p className="text-sm leading-6">{paintingText(estimate.notes, estimate.notesEs, language)}</p> : null}

      <section id="proposal-page-scope" data-testid="proposal-page-scope" data-proposal-section="Project scope" className="flex flex-col gap-3">
        <div>
          <h2 className="text-xl font-semibold">Scope of work and investment summary</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Review your customized proposal, scope breakdown, and payment terms below.
          </p>
        </div>
        <ClientWorkOrder
          companyName={companyName}
          logoUrl={estimateSettings.logoUrl}
          clientName={clientName}
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
      </section>

      {quote.lineItems.filter((line) => !optionalLines.some((item) => item.id === line.id)).length > 0 ? (
        <section data-proposal-section="Included items" className="flex flex-col gap-2">
          <h2 className="text-xs font-semibold tracking-[0.14em] text-muted-foreground uppercase">
            {say("Included items")}
          </h2>
          {quote.lineItems
            .filter((line) => !optionalLines.some((item) => item.id === line.id))
            .map((line) => (
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

      {optionalLines.length > 0 ? (
        <section data-proposal-section="Optional add-ons" className="flex flex-col gap-2">
          <h2 className="text-xs font-semibold tracking-[0.14em] text-muted-foreground uppercase">
            {say("Optional add-ons")}
          </h2>
          {optionalLines.map((line) => {
            const price = catalog.lineItems.find((item) => item.id === line.id)?.price ?? 0
            const on = chosen.includes(line.id)
            return (
              <label
                key={line.id}
                className="flex items-start justify-between gap-3 rounded-2xl bg-card px-4 py-3 border border-slate-200 bg-white shadow-sm"
              >
                <span className="flex min-w-0 items-start gap-3">
                  <input
                    type="checkbox"
                    className="mt-1 size-4"
                    checked={on}
                    disabled={Boolean(accepted)}
                    aria-label={paintingText(line.label, line.labelEs, language)}
                    onChange={() => toggle(line.id)}
                  />
                  <span className="min-w-0">
                    <ProposalLinePhoto src={line.photo} alt={paintingText(line.label, line.labelEs, language)} />
                    <ProposalLineVideo src={line.video} label={paintingText(line.label, line.labelEs, language)} />
                    <span className="block font-medium">{paintingText(line.label, line.labelEs, language)}</span>
                    {line.clientNote ? (
                      <span className="mt-1 block text-sm whitespace-pre-line text-muted-foreground">
                        {paintingText(line.clientNote, line.clientNoteEs, language)}
                      </span>
                    ) : null}
                  </span>
                </span>
                <span className="tabular-nums">{money(price)}</span>
              </label>
            )
          })}
        </section>
      ) : null}

      <ProposalTemplateSections
        template={pagesDocument.template}
        scheduledProducts={scheduledProducts}
        excludeMaterials={estimate.settings.excludeMaterials}
        language={language}
      />

      <section data-proposal-section="Price" className="rounded-2xl bg-card p-4 border border-slate-200 bg-white shadow-sm">
        <TotalRow label="Subtotal" value={money(quote.subtotal)} />
        {quote.discount > 0 ? <TotalRow label="Discount" value={money(quote.discount)} /> : null}
        {quote.tax > 0 ? <TotalRow label="Tax" value={money(quote.tax)} /> : null}
        <div className="mt-3 flex items-baseline justify-between border-t border-border pt-3">
          <p className="font-medium">Total</p>
          <p data-testid="proposal-total" className="font-display text-4xl text-primary tabular-nums">
            {money(quote.total)}
          </p>
        </div>
        <p className="mt-1 text-xs font-medium text-muted-foreground" data-testid="proposal-materials-status-summary">
          {paintMaterialsInclusionLabel(estimate.settings.excludeMaterials, language).badge}
        </p>
        <div className="mt-2 flex items-baseline justify-between">
          <p className="text-sm text-muted-foreground">{say("Deposit required")} ({figures.depositPercent}%)</p>
          <p data-testid="proposal-deposit" className="text-lg font-semibold tabular-nums">
            {money(figures.deposit)}
          </p>
        </div>
        {figures.deposit > 0 && figures.deposit < quote.total ? (
          <div className="mt-2 flex items-baseline justify-between">
            <p className="text-sm text-muted-foreground">{say("Balance after the job")}</p>
            <p data-testid="proposal-balance" className="text-lg font-semibold tabular-nums">
              {money(balanceAfterDeposit(quote.total, figures.depositPercent))}
            </p>
          </div>
        ) : null}
        <p className="mt-2 text-sm">Pay by {quote.paymentMethodLabel.toLowerCase()}.</p>
        {!accepted && !declined ? (
          <p className="mt-3 text-sm">
            <Link href={`/book/${estimate.publicToken}`} className="font-medium text-primary">
              {say("Pick a time to talk about this proposal")}
            </Link>
          </p>
        ) : null}
        <FinancingOffer total={quote.total} financing={financing} />
        {quote.surcharge > 0 ? (
          <p className="mt-1 text-sm text-muted-foreground">
            {quote.paymentMethodLabel} adds {money(quote.surcharge)}. Amount due {money(quote.amountDue)}.
          </p>
        ) : null}
      </section>

      <section data-proposal-section="Payment methods">
        <h2 className="text-xs font-semibold tracking-[0.14em] text-muted-foreground uppercase">
          Payment methods
        </h2>
        <ul className="mt-2 flex flex-wrap gap-2">
          {paymentMethods.map((method) => (
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

      {accepted && estimate.signature ? (
        <section id="proposal-page-sign" data-testid="proposal-page-sign" data-proposal-section="Accepted" className="flex flex-col gap-4 rounded-2xl bg-card p-4 border border-slate-200 bg-white shadow-sm sm:p-8">
          <p className="text-xs font-semibold tracking-[0.14em] text-muted-foreground uppercase">Accepted</p>
          <p className="font-display text-3xl">{estimate.signature.signedName}</p>
          {estimate.signature.signaturePayload.startsWith("data:") ? (
            <div
              role="img"
              aria-label={`Signature of ${estimate.signature.signedName}`}
              className="h-24 w-full rounded-xl bg-white bg-contain bg-center bg-no-repeat"
              style={{ backgroundImage: `url("${estimate.signature.signaturePayload}")` }}
            />
          ) : null}
          <ProposalSignatureCopy
            acceptWording={pagesDocument.acceptWording}
            declineWording={pagesDocument.declineWording}
          />
          <p className="text-sm text-muted-foreground">
            Signed {signedLabel(estimate.signature.signedAt)}. {say("The crew work order is with your painter.")}
          </p>
          {estimate.paymentStatus === "paid" ? (
            <p className="text-sm font-medium">{say("Paid")}</p>
          ) : estimate.paymentStatus === "deposit_paid" ? (
            <p className="text-sm font-medium">{say("Deposit Paid / Scheduled")}</p>
          ) : figures.deposit > 0 ? (
            <div className="flex flex-col gap-2 sm:flex-row">
              <Link
                href={payHref}
                data-testid="signature-pay-deposit"
                className="inline-flex h-12 items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground sm:flex-1"
              >
                {say("Pay deposit")} · {money(figures.deposit)}
              </Link>
              <a
                href={pdfHref}
                download="proposal.pdf"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-slate-900 hover:bg-slate-50 sm:flex-1"
              >
                <Download className="size-4" aria-hidden="true" />
                <span>Download signed copy</span>
              </a>
            </div>
          ) : (
            <div className="flex flex-col gap-2 sm:flex-row">
              <Link
                href={payHref}
                className="inline-flex h-12 items-center justify-center rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-slate-900 hover:bg-slate-50 sm:flex-1"
              >
                View payment information
              </Link>
              <a
                href={pdfHref}
                download="proposal.pdf"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-slate-900 hover:bg-slate-50 sm:flex-1"
              >
                <Download className="size-4" aria-hidden="true" />
                <span>Download signed copy</span>
              </a>
            </div>
          )}
          <p className="text-xs tracking-[0.14em] text-muted-foreground uppercase">
            Signature · {pageNumber(pages, "proposal-page-sign")} of {pages.length}
          </p>
        </section>
      ) : declined ? (
        <section id="proposal-page-sign" data-testid="proposal-page-sign" data-proposal-section="Declined" className="flex flex-col gap-4 rounded-2xl bg-card p-4 border border-slate-200 bg-white shadow-sm sm:p-8">
          <p className="text-xs font-semibold tracking-[0.14em] text-muted-foreground uppercase">Declined</p>
          <ProposalSignatureCopy
            acceptWording={pagesDocument.acceptWording}
            declineWording={pagesDocument.declineWording}
          />
          <p className="text-sm text-muted-foreground">
            Declined {estimate.declinedAt ? signedLabel(estimate.declinedAt) : "today"}. No work is scheduled from this proposal.
          </p>
        </section>
      ) : (
        <form id="proposal-page-sign" data-testid="proposal-page-sign" data-proposal-section="Accept and sign" onSubmit={submit} className="flex flex-col gap-4 rounded-2xl bg-card p-4 border border-slate-200 bg-white shadow-sm sm:p-8">
          <div>
            <h2 className="text-lg font-semibold">Accept and sign</h2>
            <p className="text-sm text-muted-foreground">Type your name, then sign in the box. The wording under the signature is the choice you are making.</p>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="signed-name">Legal name</Label>
            <Input
              id="signed-name"
              value={signedName}
              className="h-11"
              autoComplete="name"
              onValueChange={onSignedName}
            />
          </div>
          <SignaturePad
            onChange={(payload) => {
              onSignature(payload)
            }}
          />
          <ProposalSignatureCopy
            acceptWording={pagesDocument.acceptWording}
            declineWording={pagesDocument.declineWording}
          />
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button type="submit" data-testid="accept-proposal" disabled={accepting} className="h-12 sm:flex-1">
              {accepting ? "Submitting signature…" : `Accept proposal · ${money(quote.total)}`}
            </Button>
            {confirmDecline ? (
              <Button type="button" variant="destructive" data-testid="confirm-decline" className="h-12 sm:flex-1" onClick={decline}>
                Decline this proposal
              </Button>
            ) : (
              <Button type="button" variant="outline" data-testid="decline-proposal" className="h-12 sm:flex-1" onClick={() => setConfirmDecline(true)}>
                Decline
              </Button>
            )}
          </div>
          <p className="text-xs tracking-[0.14em] text-muted-foreground uppercase">
            Signature · {pageNumber(pages, "proposal-page-sign")} of {pages.length}
          </p>
        </form>
      )}
      <section
        id="proposal-questions"
        data-testid="contact-contractor"
        className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm print:hidden sm:p-6"
      >
        <div>
          <h2 className="text-lg font-semibold">Questions? Contact Your Contractor</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Reach {companyName} directly by phone, email, or send a message below.
          </p>
          {companyPhone || companyEmail ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {companyPhone ? (
                <a
                  href={`tel:${companyPhone.replace(/[^+\d]/g, "")}`}
                  data-testid="contractor-phone-link"
                  className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-slate-200 px-3 text-sm font-medium hover:bg-slate-50"
                >
                  <Phone className="size-4 text-primary" aria-hidden="true" />
                  <span>{companyPhone}</span>
                </a>
              ) : null}
              {companyEmail ? (
                <a
                  href={`mailto:${companyEmail}`}
                  data-testid="contractor-email-link"
                  className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-slate-200 px-3 text-sm font-medium hover:bg-slate-50"
                >
                  <Mail className="size-4 text-primary" aria-hidden="true" />
                  <span>{companyEmail}</span>
                </a>
              ) : null}
            </div>
          ) : null}
        </div>
        <ProposalChat
          messages={estimate.proposalMessages ?? []}
          customerName={clientName}
          viewer="customer"
          onSend={onSendMessage}
        />
      </section>
    </article>
  )
}

function signedLabel(iso: string): string {
  return new Date(iso).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })
}

function FinancingOffer({
  total,
  financing,
}: {
  total: number
  financing: { enabled: boolean; aprPercent: number; months: number; lender: string; applyUrl: string }
}) {
  if (!financing.enabled || total <= 0) return null
  const payment = monthlyPayment(total, financing.aprPercent, financing.months)
  if (payment <= 0) return null
  const lender = financing.lender || "Financing"
  return (
    <div className="mt-4 rounded-xl bg-muted/60 px-3 py-3" data-testid="proposal-financing">
      <p className="text-sm font-medium">
        {lender}: as low as {moneyExact(payment)}/mo for {financing.months} months
      </p>
      <p className="mt-1 text-sm text-muted-foreground">
        Payment estimate at {financing.aprPercent}% APR. The lender decides whether to offer financing.
      </p>
      {financing.applyUrl ? (
        <a href={financing.applyUrl} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block text-sm font-medium text-primary">
          See if you qualify
        </a>
      ) : null}
    </div>
  )
}

function TotalRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3 py-1 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  )
}
