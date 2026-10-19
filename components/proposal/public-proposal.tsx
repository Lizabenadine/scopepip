"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { CompanyName } from "@/components/brand/company-name"
import { ProposalEngagement } from "@/components/proposal/proposal-engagement"
import { SignaturePad } from "@/components/proposal/signature-pad"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { displayCompanyName } from "@/lib/brand/company"
import { readProposalCompanyName } from "@/lib/brand/profile"
import { useScope } from "@/lib/data/store"
import { calculateEstimate } from "@/lib/estimate/calculate"
import { sectionByGroup } from "@/lib/estimate/groups"
import type { EstimateSettings, PaymentMethod } from "@/lib/types"
import { jobDate, money, moneyExact } from "@/lib/format"
import { financingTerms, monthlyPayment } from "@/lib/financing/offer"
import { proposalFigures } from "@/lib/proposals/figures"
import type { Estimate } from "@/lib/types"

const TERMS = [
  "This proposal covers the rooms, surfaces, and add-ons you leave selected. Anything outside that scope is a change order.",
  "The price stays firm until the date below. After that, the painter can reprice materials and labor.",
  "You provide clear access to the work areas. Furniture and floors are protected before paint starts.",
  "Payment follows the methods listed. A card surcharge is added only when that method is chosen.",
  "Signing accepts this price and authorizes the painter to open the crew work order.",
]

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
}: {
  estimate: Estimate
  clientName: string
  companyName: string
  companyEmail: string
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
}) {
  const accepted = estimate.clientStatus === "accepted" && estimate.signature
  const optionalLines = estimate.lineItems.filter((item) => item.optional)
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
    rates: estimate.rates,
    settings: estimate.settings,
    paymentMethods,
  })
  const expires =
    estimate.settings.expiryDays > 0
      ? new Date(new Date(estimate.createdAt).getTime() + estimate.settings.expiryDays * 86400000)
      : null

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

  return (
    <article className="flex flex-col gap-8">
      <ProposalEngagement proposalId={estimate.publicToken} />
      <header className="flex flex-col gap-4 border-b border-border pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <CompanyName
            name={companyName}
            testId="proposal-brand"
            className="font-display text-3xl leading-none tracking-tight text-primary"
          />
          <p className="mt-2 text-sm text-muted-foreground">
            Painting proposal #{estimate.publicToken}
          </p>
          <p className="text-sm text-muted-foreground">Prepared for client view</p>
          {companyEmail ? <p className="mt-1 text-sm text-muted-foreground">{companyEmail}</p> : null}
        </div>
        <div className="text-sm sm:text-right">
          <p className="text-xs font-semibold tracking-[0.14em] text-muted-foreground uppercase">
            {accepted ? "Accepted" : "Prepared for"}
          </p>
          <p className="font-medium">{clientName}</p>
          <p>{estimate.jobAddress || "Job site not set"}</p>
        </div>
      </header>

      <div>
        <h1 className="font-display text-4xl leading-none tracking-tight">{estimate.title}</h1>
        {expires ? (
          <p className="mt-1 text-sm text-muted-foreground">
            Price holds through {jobDate(expires.toISOString().slice(0, 10))}
          </p>
        ) : null}
      </div>

      {estimate.notes ? <p className="text-sm leading-6">{estimate.notes}</p> : null}

      <section data-proposal-section="Project scope" className="flex flex-col gap-3">
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
                <span className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    className="mt-1 size-4"
                    checked={on}
                    disabled={Boolean(accepted)}
                    aria-label={line.label}
                    onChange={() => toggle(line.id)}
                  />
                  <span>
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

      <section data-proposal-section="Terms" className="flex flex-col gap-2">
        <h2 className="text-xs font-semibold tracking-[0.14em] text-muted-foreground uppercase">Terms</h2>
        <ol className="list-decimal space-y-2 pl-5 text-sm leading-6 text-muted-foreground">
          {TERMS.map((term) => (
            <li key={term}>{term}</li>
          ))}
        </ol>
      </section>

      {accepted && estimate.signature ? (
        <section data-proposal-section="Accepted" className="rounded-2xl bg-card p-4 ring-1 ring-foreground/10">
          <p className="text-xs font-semibold tracking-[0.14em] text-muted-foreground uppercase">Accepted</p>
          <p className="mt-2 font-display text-3xl">{estimate.signature.signedName}</p>
          {estimate.signature.signaturePayload.startsWith("data:") ? (
            <div
              role="img"
              aria-label={`Signature of ${estimate.signature.signedName}`}
              className="mt-3 h-24 w-full rounded-xl bg-white bg-contain bg-center bg-no-repeat"
              style={{ backgroundImage: `url("${estimate.signature.signaturePayload}")` }}
            />
          ) : null}
          <p className="mt-2 text-sm text-muted-foreground">
            Signed {signedLabel(estimate.signature.signedAt)}. The crew work order is with your painter.
          </p>
          {estimate.paymentStatus === "deposit_paid" ? (
            <p className="mt-3 text-sm font-medium">Deposit Paid / Scheduled</p>
          ) : (
            <Link
              href={`/estimates/${estimate.id}/pay`}
              className="mt-4 inline-flex h-12 items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground"
            >
              Pay deposit
            </Link>
          )}
        </section>
      ) : (
        <form data-proposal-section="Accept and sign" onSubmit={submit} className="flex flex-col gap-4 rounded-2xl bg-card p-4 ring-1 ring-foreground/10">
          <div>
            <h2 className="text-lg font-semibold">Accept and sign</h2>
            <p className="text-sm text-muted-foreground">Type your name, then sign in the box.</p>
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
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <Button type="submit" data-testid="accept-proposal" className="h-12">
            Accept proposal · {money(quote.total)}
          </Button>
        </form>
      )}
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
