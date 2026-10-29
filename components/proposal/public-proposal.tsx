"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { ProposalEngagement } from "@/components/proposal/proposal-engagement"
import { ProposalChat } from "@/components/proposal/proposal-chat"
import {
  ProposalCover,
  ProposalPager,
  ProposalPhotoPage,
  ProposalSignatureCopy,
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
import { useScope } from "@/lib/data/store"
import { calculateEstimate } from "@/lib/estimate/calculate"
import { ensureSubstrateRates } from "@/lib/estimate/substrate"
import { sectionByGroup } from "@/lib/estimate/groups"
import type { Estimate, EstimateSettings, PaymentMethod } from "@/lib/types"
import { jobDate, money, moneyExact } from "@/lib/format"
import { financingTerms, monthlyPayment } from "@/lib/financing/offer"
import { proposalDocument, proposalPageList } from "@/lib/proposals/document"
import { ProposalLinePhoto } from "@/components/proposal/line-photo"
import { ProposalLineVideo } from "@/components/proposal/line-video"
import { proposalFigures } from "@/lib/proposals/figures"

interface ProposalPayload {
  estimate: Estimate
  clientName: string
  companyName: string
  companyEmail: string
  paymentMethods: PaymentMethod[]
  estimateSettings: EstimateSettings
}

export function PublicProposal({ token }: { token: string }) {
  const scope = useScope()
  const [view, setView] = useState<ProposalPayload | null>(null)
  const [missing, setMissing] = useState(false)
  const [selectedIds, setSelectedIds] = useState<string[] | null>(null)
  const [signedName, setSignedName] = useState("")
  const [signaturePayload, setSignaturePayload] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [profileName, setProfileName] = useState<string | null>(null)

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
        if (scope.session) await scope.reloadBook()
        return { ok: true as const }
      }}
      onDecline={async () => {
        const response = await fetch(`/api/public/proposals/${encodeURIComponent(token)}/decline`, { method: "POST" })
        const result = (await response.json()) as { ok?: boolean; reason?: string; estimate?: Estimate }
        if (!response.ok || !result.ok || !result.estimate) {
          return { ok: false as const, reason: result.reason || "This proposal could not be declined." }
        }
        setView({ ...view, estimate: result.estimate })
        if (scope.session) await scope.reloadBook()
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
        if (scope.session) await scope.reloadBook()
        return { ok: true as const }
      }}
    />
  )
}

function ProposalDocument({
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
  onAccept,
  onDecline,
  onSendMessage,
}: {
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
  onAccept: (input: { signedName: string; signaturePayload: string; selectedLineIds: string[] }) => Promise<
    { ok: true } | { ok: false; reason: string }
  >
  onDecline: () => Promise<{ ok: true } | { ok: false; reason: string }>
  onSendMessage: (body: string) => Promise<{ ok: true } | { ok: false; reason: string }>
}) {
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
  const pagesDocument = proposalDocument(estimateSettings)
  const pages = proposalPageList(pagesDocument)
  const declined = estimate.clientStatus === "declined" || Boolean(estimate.declinedAt)
  const [confirmDecline, setConfirmDecline] = useState(false)
  const preparedOn = jobDate(estimate.createdAt.slice(0, 10))
  const expiresOn = expires ? jobDate(expires.toISOString().slice(0, 10)) : null

  const toggle = (id: string) => {
    if (accepted) return
    const next = chosen.includes(id) ? chosen.filter((item) => item !== id) : [...chosen, id]
    onSelectedIds(next)
  }

  const submit = (event: React.FormEvent) => {
    event.preventDefault()
    const payload = signaturePayload || (signedName.trim() ? `typed:${signedName.trim()}` : "")
    void onAccept({
      signedName,
      signaturePayload: payload,
      selectedLineIds: chosen,
    }).then((result) => onError(result.ok ? null : result.reason))
  }

  const decline = () => {
    void onDecline().then((result) => {
      if (!result.ok) onError(result.reason)
    })
  }

  return (
    <article className="flex flex-col gap-8">
      <ProposalEngagement proposalId={estimate.publicToken} />
      <ProposalPager pages={pages} />
      <ProposalCover
        companyName={companyName}
        clientName={clientName}
        title={estimate.title}
        jobAddress={estimate.jobAddress}
        companyEmail={companyEmail}
        preparedOn={preparedOn}
        expiresOn={expiresOn}
        total={quote.total}
        coverLine={pagesDocument.coverLine}
        page={pageNumber(pages, "proposal-page-cover")}
        pageCount={pages.length}
      />

      {estimate.notes ? <p className="text-sm leading-6">{estimate.notes}</p> : null}

      <section id="proposal-page-scope" data-testid="proposal-page-scope" data-proposal-section="Project scope" className="flex flex-col gap-3">
        <div>
          <h2 className="text-xl font-semibold">Scope of work and investment summary</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Review your customized proposal, scope breakdown, and payment terms below.
          </p>
        </div>
        {sectionByGroup(
          quote.areas.filter((area) => area.surfaces.length > 0),
          estimate.areaGroups,
          (area) => estimate.areas.find((item) => item.id === area.id)?.groupId,
        ).map((section) => (
          <div key={section.groupId ?? "ungrouped"} className="flex flex-col gap-3">
            {section.groupName ? (
              <p className="text-xs font-semibold tracking-[0.14em] text-muted-foreground uppercase" data-testid="proposal-group">
                {section.groupName}
              </p>
            ) : null}
            {section.items.map((area) => {
              const visible = area.surfaces.filter((surface) => !surface.hideFromCustomer)
              return (
                <div key={area.id} className="rounded-2xl bg-card p-4 ring-1 ring-foreground/10">
                  <div className="flex items-baseline justify-between gap-3">
                    <h3 className="text-lg font-semibold">{area.name}</h3>
                    <p className="font-display text-2xl text-price tabular-nums">{money(area.clientPrice)}</p>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {area.areaType === "room"
                      ? `${area.lengthFt} × ${area.widthFt} × ${area.heightFt} ft`
                      : `${area.lengthFt} × ${area.heightFt} ft`}
                    {area.wallSqFt > 0 ? ` · ${area.wallSqFt} sq ft walls` : ""}
                  </p>
                  <ul className="mt-3 flex flex-col gap-2">
                    {visible.map((surface) => (
                      <li key={surface.id} className="flex items-baseline justify-between gap-3 text-sm">
                        <span>
                          <span className="font-medium">{surface.clientLabel}</span>
                          {surface.showCoats && surface.coatCount > 0 ? ` · ${surface.coatCount} coats` : ""}
                          {surface.clientDescription ? (
                            <span className="block text-muted-foreground">{surface.clientDescription}</span>
                          ) : null}
                        </span>
                        {surface.showPrice ? <span className="tabular-nums">{money(surface.price)}</span> : null}
                      </li>
                    ))}
                  </ul>
                </div>
              )
            })}
          </div>
        ))}
      </section>

      {quote.lineItems.filter((line) => !optionalLines.some((item) => item.id === line.id)).length > 0 ? (
        <section data-proposal-section="Included items" className="flex flex-col gap-2">
          <h2 className="text-xs font-semibold tracking-[0.14em] text-muted-foreground uppercase">
            Included items
          </h2>
          {quote.lineItems
            .filter((line) => !optionalLines.some((item) => item.id === line.id))
            .map((line) => (
              <div key={line.id} className="flex items-start justify-between gap-3 rounded-2xl bg-card px-4 py-3 ring-1 ring-foreground/10">
                <div className="min-w-0">
                  <ProposalLinePhoto src={line.photo} alt={line.label} />
                  <ProposalLineVideo src={line.video} label={line.label} />
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

      {optionalLines.length > 0 ? (
        <section data-proposal-section="Optional add-ons" className="flex flex-col gap-2">
          <h2 className="text-xs font-semibold tracking-[0.14em] text-muted-foreground uppercase">
            Optional add-ons
          </h2>
          {optionalLines.map((line) => {
            const price = catalog.lineItems.find((item) => item.id === line.id)?.price ?? 0
            const on = chosen.includes(line.id)
            return (
              <label
                key={line.id}
                className="flex items-start justify-between gap-3 rounded-2xl bg-card px-4 py-3 ring-1 ring-foreground/10"
              >
                <span className="flex min-w-0 items-start gap-3">
                  <input
                    type="checkbox"
                    className="mt-1 size-4"
                    checked={on}
                    disabled={Boolean(accepted)}
                    aria-label={line.label}
                    onChange={() => toggle(line.id)}
                  />
                  <span className="min-w-0">
                    <ProposalLinePhoto src={line.photo} alt={line.label} />
                    <ProposalLineVideo src={line.video} label={line.label} />
                    <span className="block font-medium">{line.label}</span>
                    {line.clientNote ? (
                      <span className="mt-1 block text-sm whitespace-pre-line text-muted-foreground">
                        {line.clientNote}
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

      <section data-proposal-section="Price" className="rounded-2xl bg-card p-4 ring-1 ring-foreground/10">
        <TotalRow label="Subtotal" value={money(quote.subtotal)} />
        {quote.discount > 0 ? <TotalRow label="Discount" value={money(quote.discount)} /> : null}
        {quote.tax > 0 ? <TotalRow label="Tax" value={money(quote.tax)} /> : null}
        <div className="mt-3 flex items-baseline justify-between border-t border-border pt-3">
          <p className="font-medium">Total</p>
          <p data-testid="proposal-total" className="font-display text-4xl text-price tabular-nums">
            {money(quote.total)}
          </p>
        </div>
        <div className="mt-2 flex items-baseline justify-between">
          <p className="text-sm text-muted-foreground">Deposit required ({figures.depositPercent}%)</p>
          <p data-testid="proposal-deposit" className="text-lg font-semibold tabular-nums">
            {money(figures.deposit)}
          </p>
        </div>
        <p className="mt-2 text-sm">Pay by {quote.paymentMethodLabel.toLowerCase()}.</p>
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
        <section id="proposal-page-sign" data-testid="proposal-page-sign" data-proposal-section="Accepted" className="flex flex-col gap-4 rounded-2xl bg-card p-4 ring-1 ring-foreground/10 sm:p-8">
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
            Signed {signedLabel(estimate.signature.signedAt)}. The crew work order is with your painter.
          </p>
          {estimate.paymentStatus === "deposit_paid" ? (
            <p className="text-sm font-medium">Deposit Paid / Scheduled</p>
          ) : (
            <Link
              href={`/estimates/${estimate.id}/pay`}
              className="inline-flex h-12 items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground"
            >
              Pay deposit
            </Link>
          )}
          <p className="text-xs tracking-[0.14em] text-muted-foreground uppercase">
            Signature · {pageNumber(pages, "proposal-page-sign")} of {pages.length}
          </p>
        </section>
      ) : declined ? (
        <section id="proposal-page-sign" data-testid="proposal-page-sign" data-proposal-section="Declined" className="flex flex-col gap-4 rounded-2xl bg-card p-4 ring-1 ring-foreground/10 sm:p-8">
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
        <form id="proposal-page-sign" data-testid="proposal-page-sign" data-proposal-section="Accept and sign" onSubmit={submit} className="flex flex-col gap-4 rounded-2xl bg-card p-4 ring-1 ring-foreground/10 sm:p-8">
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
            <Button type="submit" data-testid="accept-proposal" className="h-12 sm:flex-1">
              Accept proposal · {money(quote.total)}
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
      <ProposalChat
        messages={estimate.proposalMessages ?? []}
        customerName={clientName}
        viewer="customer"
        onSend={onSendMessage}
      />
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
