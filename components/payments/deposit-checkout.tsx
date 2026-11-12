"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Download, Mail, PaintRoller, Phone } from "lucide-react"
import { PendingWork } from "@/components/payments/pending-work"
import { StripePaymentForm } from "@/components/payments/stripe-payment-form"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { roleCanOpen } from "@/lib/auth/access"
import { useScope } from "@/lib/data/store"
import { calculateEstimate } from "@/lib/estimate/calculate"
import { money } from "@/lib/format"
import { depositAmount, depositMethod, clampDepositPercent, type PaymentIntentPayload } from "@/lib/payments/deposit"
import { proposalFigures } from "@/lib/proposals/figures"
import type { DepositMethod, DepositReceipt, Estimate, EstimateSettings, PaymentMethod } from "@/lib/types"

const TEST_CARD = "4242424242424242"

interface IntentResponse {
  mode: "test" | "stripe"
  paymentIntentId: string
  testToken?: string
  clientSecret: string | null
  publishableKey: string | null
  depositAmount: number
  depositPercent: number
  error?: string
}

interface CheckoutState {
  estimate: Estimate
  paymentMethods: PaymentMethod[]
  clientName: string
  companyName: string
  companyEmail: string
  companyPhone: string
}

/** Contractor deposit view (`/estimates/[id]/pay`) inside authenticated AppShell. */
export function DepositCheckout({ id }: { id: string }) {
  const scope = useScope()
  const [data, setData] = useState<CheckoutState | null>(null)
  const [missing, setMissing] = useState(false)

  useEffect(() => {
    let cancelled = false
    void fetch(`/api/public/estimates/${encodeURIComponent(id)}`)
      .then(async (response) => {
        if (!response.ok) {
          if (!cancelled) setMissing(true)
          return
        }
        const payload = (await response.json()) as {
          estimate?: Estimate
          clientName?: string
          paymentMethods?: PaymentMethod[]
        }
        if (cancelled || !payload.estimate) return
        setData({
          estimate: payload.estimate,
          clientName: payload.clientName || "Client",
          paymentMethods: payload.paymentMethods ?? [],
          companyName: "",
          companyEmail: "",
          companyPhone: "",
        })
      })
      .catch(() => {
        if (!cancelled) setMissing(true)
      })
    return () => {
      cancelled = true
    }
  }, [id])

  const canAccessInvoice = Boolean(scope.session && roleCanOpen(scope.session.role, "/payments"))

  return (
    <DepositCheckoutView
      data={data}
      missing={missing}
      missingLabel="This estimate is not available."
      canAccessInvoice={canAccessInvoice}
      onUpdate={(next) => {
        setData((prev) => (prev ? { ...prev, estimate: next } : prev))
        if (scope.session) void scope.reloadBook()
      }}
    />
  )
}

/** Isolated homeowner deposit view (`/p/[token]/pay`) validated strictly by proposal token. */
export function ClientDepositCheckout({ token }: { token: string }) {
  const [data, setData] = useState<CheckoutState | null>(null)
  const [missing, setMissing] = useState(false)

  useEffect(() => {
    let cancelled = false
    void fetch(`/api/public/proposals/${encodeURIComponent(token)}`)
      .then(async (response) => {
        if (!response.ok) {
          if (!cancelled) setMissing(true)
          return
        }
        const payload = (await response.json()) as {
          estimate?: Estimate
          clientName?: string
          companyName?: string
          companyEmail?: string
          paymentMethods?: PaymentMethod[]
          estimateSettings?: EstimateSettings
        }
        if (cancelled || !payload.estimate) {
          if (!cancelled) setMissing(true)
          return
        }
        setData({
          estimate: payload.estimate,
          clientName: payload.clientName || "Client",
          paymentMethods: payload.paymentMethods ?? [],
          companyName: payload.companyName || "",
          companyEmail: payload.companyEmail || "",
          companyPhone: payload.estimateSettings?.businessPhone?.trim() || "",
        })
      })
      .catch(() => {
        if (!cancelled) setMissing(true)
      })
    return () => {
      cancelled = true
    }
  }, [token])

  return (
    <DepositCheckoutView
      data={data}
      missing={missing}
      token={token}
      missingLabel="This proposal payment link is not valid."
      canAccessInvoice={false}
      onUpdate={(next) => setData((prev) => (prev ? { ...prev, estimate: next } : prev))}
    />
  )
}

function DepositCheckoutView({
  data,
  missing,
  token,
  missingLabel,
  canAccessInvoice,
  onUpdate,
}: {
  data: CheckoutState | null
  missing: boolean
  token?: string
  missingLabel: string
  canAccessInvoice: boolean
  onUpdate: (estimate: Estimate) => void
}) {
  const [open, setOpen] = useState(false)
  const [intent, setIntent] = useState<IntentResponse | null>(null)
  const [method, setMethod] = useState<DepositMethod>("card")
  const [cardNumber, setCardNumber] = useState("")
  const [expiry, setExpiry] = useState("")
  const [cvc, setCvc] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  if (!data && !missing) {
    return <div className="h-40 animate-pulse rounded-2xl bg-muted" aria-hidden />
  }
  if (!data) {
    return (
      <div className="rounded-2xl border border-dashed border-border px-4 py-12 text-center">
        <h1 className="text-xl font-semibold">{missingLabel}</h1>
        <p className="mt-2 text-sm text-muted-foreground">Ask your contractor for a new proposal link.</p>
      </div>
    )
  }

  const { estimate, paymentMethods, clientName, companyName, companyEmail, companyPhone } = data
  const chosenIds = estimate.signature?.selectedLineIds ?? []
  const figures = token
    ? proposalFigures(estimate, paymentMethods, chosenIds)
    : {
        quote: calculateEstimate({
          areas: estimate.areas,
          lineItems: estimate.lineItems,
          rates: estimate.rates,
          settings: estimate.settings,
          paymentMethods,
        }),
        depositPercent: clampDepositPercent(estimate.settings.depositPercent),
        deposit: 0,
      }
  const quote = figures.quote
  const percent = clampDepositPercent(estimate.settings.depositPercent)
  const amount = depositAmount(quote.total, percent)
  const paid = estimate.paymentStatus === "deposit_paid" && estimate.depositReceipt
  const proposalHref = token ? `/p/${encodeURIComponent(token)}` : `/p/${encodeURIComponent(estimate.publicToken)}`
  const pdfHref = token ? `/api/public/proposals/${encodeURIComponent(token)}/pdf` : null

  const handleBackToInvoice = (event: React.MouseEvent<HTMLAnchorElement>) => {
    if (typeof window !== "undefined" && window.history.length > 1 && document.referrer.includes("/payments")) {
      event.preventDefault()
      window.history.back()
    }
  }

  const openCheckout = async () => {
    setError(null)
    setPending(true)
    const response = await fetch("/api/payments/create-intent", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(token ? { token } : { estimateId: estimate.id }),
    })
    const payload = (await response.json()) as IntentResponse
    setPending(false)
    if (!response.ok || payload.error) {
      setError(payload.error ?? "Could not start the payment.")
      return
    }
    setIntent(payload)
    setOpen(true)
  }

  const finish = async (receipt: DepositReceipt) => {
    const depositUrl = token
      ? `/api/public/proposals/${encodeURIComponent(token)}/deposit`
      : `/api/public/estimates/${encodeURIComponent(estimate.id)}/deposit`
    const response = await fetch(depositUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(receipt),
    })
    const result = (await response.json()) as { ok?: boolean; reason?: string; estimate?: Estimate }
    if (!response.ok || !result.ok || !result.estimate) {
      setError(result.reason || "The deposit was not recorded.")
      return
    }
    onUpdate(result.estimate)
    setOpen(false)
  }

  const confirmTest = async (nextMethod: DepositMethod) => {
    if (!intent) return
    if (nextMethod === "card") {
      const digits = cardNumber.replace(/\D/g, "")
      if (digits !== TEST_CARD) {
        setError("Your card was declined. Use the test card 4242 4242 4242 4242.")
        return
      }
      if (!/^\d{2}\/\d{2}$/.test(expiry) || !/^\d{3,4}$/.test(cvc)) {
        setError("Enter an expiry and CVC.")
        return
      }
    }
    setPending(true)
    setError(null)
    const intentPayload: PaymentIntentPayload = {
      id: intent.paymentIntentId,
      amount: Math.round(intent.depositAmount * 100),
      currency: "usd",
      metadata: {
        estimateId: estimate.id,
        depositPercent: String(intent.depositPercent),
        method: nextMethod,
        testToken: intent.testToken,
      },
    }
    const response = await fetch("/api/webhooks/stripe", {
      method: "POST",
      headers: { "content-type": "application/json", "x-scopepipe-test": "1" },
      body: JSON.stringify({ type: "payment_intent.succeeded", data: { object: intentPayload } }),
    })
    const payload = (await response.json()) as { receipt?: DepositReceipt; error?: string }
    setPending(false)
    if (!response.ok || !payload.receipt) {
      setError(payload.error ?? "The deposit was not recorded.")
      return
    }
    void finish(payload.receipt)
  }

  return (
    <article className="mx-auto flex max-w-xl flex-col gap-6">
      {canAccessInvoice && !token ? (
        <div className="flex items-center">
          <Link
            href={`/payments?id=${encodeURIComponent(estimate.id)}`}
            onClick={handleBackToInvoice}
            data-testid="back-to-invoice"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <span aria-hidden="true">←</span>
            <span>Back to Invoice</span>
          </Link>
        </div>
      ) : estimate.publicToken || token ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            href={proposalHref}
            data-testid="back-to-proposal"
            className="inline-flex min-h-10 items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <span aria-hidden="true">←</span>
            <span>Back to Proposal</span>
          </Link>
          {pdfHref ? (
            <a
              href={pdfHref}
              download="proposal.pdf"
              data-testid="payment-download-pdf"
              className="inline-flex min-h-10 items-center gap-1.5 text-sm font-medium text-primary hover:underline"
            >
              <Download className="size-4" aria-hidden="true" />
              <span>Download PDF</span>
            </a>
          ) : null}
        </div>
      ) : null}

      <header className="flex items-center gap-3">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
          <PaintRoller className="size-5" />
        </span>
        <div className="min-w-0">
          <p className="text-lg font-semibold tracking-tight">
            {companyName || "ScopePipe"}
          </p>
          <p className="text-xs text-muted-foreground">Job deposit &amp; payment information</p>
        </div>
      </header>

      <div>
        <h1 className="font-display text-3xl leading-none tracking-tight sm:text-4xl">{estimate.title}</h1>
        <p className="mt-3 text-sm">{clientName}</p>
        <p className="text-sm text-muted-foreground">{estimate.jobAddress}</p>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Job total</span>
          <span className="tabular-nums">{money(quote.total)}</span>
        </div>
        {(estimate.credits ?? []).reduce((sum, credit) => sum + credit.amount, 0) > 0 ? (
          <div className="mt-2 flex justify-between text-sm">
            <span className="text-muted-foreground">Credits</span>
            <span className="tabular-nums">{money(-((estimate.credits ?? []).reduce((sum, credit) => sum + credit.amount, 0)))}</span>
          </div>
        ) : null}
        <div className="mt-3 flex items-baseline justify-between border-t border-border pt-3">
          <p className="font-medium">{percent}% deposit</p>
          <p data-testid="deposit-amount" className="font-display text-3xl text-price tabular-nums sm:text-4xl">
            {money(amount)}
          </p>
        </div>
      </section>

      <PendingWork
        estimate={estimate}
        token={token}
        onSigned={onUpdate}
      />

      {estimate.clientStatus !== "accepted" ? (
        <div className="rounded-2xl border border-dashed border-border px-4 py-6 text-center">
          <p className="font-medium">Accept the proposal before paying the deposit.</p>
          <Link href={proposalHref} className="mt-3 inline-block text-sm font-medium text-primary">
            Open the proposal
          </Link>
        </div>
      ) : paid && estimate.depositReceipt ? (
        <section data-testid="deposit-status" className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold tracking-[0.14em] text-muted-foreground uppercase">
            Deposit Paid / Scheduled
          </p>
          <p className="mt-2 font-display text-3xl tabular-nums">{money(estimate.depositReceipt.amount)}</p>
          <p className="mt-2 text-sm text-muted-foreground">
            {methodLabel(estimate.depositReceipt.method)} · {estimate.depositReceipt.paymentIntentId}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Paid {new Date(estimate.depositReceipt.paidAt).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}.
            The crew work order is with your painter.
          </p>
          {estimate.paymentStatus === "paid" ? <p className="mt-2 text-sm font-medium">Balance paid.</p> : null}
        </section>
      ) : estimate.paymentStatus === "paid" ? (
        <section data-testid="deposit-status" className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold tracking-[0.14em] text-muted-foreground uppercase">Paid in full</p>
          <p className="mt-2 text-sm text-muted-foreground">This proposal balance has been marked paid.</p>
        </section>
      ) : amount <= 0 ? (
        <section data-testid="deposit-not-required" className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="font-medium">No online deposit payment is required</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Your accepted total is {money(quote.total)} due according to the proposal payment terms ({quote.paymentMethodLabel}).
          </p>
        </section>
      ) : (
        <div className="flex flex-col gap-3">
          {error && !open ? <p className="text-sm text-destructive">{error}</p> : null}
          <Button type="button" data-testid="pay-deposit" className="h-12" disabled={pending} onClick={openCheckout}>
            Pay {money(amount)} deposit
          </Button>
        </div>
      )}

      {token ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm" data-testid="payment-contact-contractor">
          <h2 className="text-sm font-semibold">Questions? Contact Your Contractor</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {companyName || "Your contractor"} can help with scheduling or payment questions.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {companyPhone ? (
              <a
                href={`tel:${companyPhone.replace(/[^+\d]/g, "")}`}
                className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-slate-200 px-3 text-sm font-medium hover:bg-slate-50"
              >
                <Phone className="size-4" aria-hidden="true" />
                <span>{companyPhone}</span>
              </a>
            ) : null}
            {companyEmail ? (
              <a
                href={`mailto:${companyEmail}`}
                className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-slate-200 px-3 text-sm font-medium hover:bg-slate-50"
              >
                <Mail className="size-4" aria-hidden="true" />
                <span>{companyEmail}</span>
              </a>
            ) : null}
            <Link
              href={`${proposalHref}#proposal-questions`}
              className="inline-flex min-h-10 items-center rounded-lg bg-primary/10 px-3 text-sm font-medium text-primary hover:bg-primary/15"
            >
              Send a message on your proposal
            </Link>
          </div>
        </section>
      ) : null}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Pay deposit</DialogTitle>
            <DialogDescription>
              {money(amount)} by card or a phone wallet.
            </DialogDescription>
          </DialogHeader>
          {intent?.mode === "stripe" && intent.clientSecret && intent.publishableKey ? (
            <StripePaymentForm
              publishableKey={intent.publishableKey}
              clientSecret={intent.clientSecret}
              onSuccess={() => {
                if (!intent) return
                void finish({
                  paymentIntentId: intent.paymentIntentId,
                  amount: intent.depositAmount,
                  currency: "usd",
                  depositPercent: intent.depositPercent,
                  method: "card",
                  paidAt: new Date().toISOString(),
                })
              }}
              onError={setError}
            />
          ) : (
            <div className="flex flex-col gap-4 px-4 pb-4">
              <div className="grid grid-cols-3 gap-2">
                {(
                  [
                    ["card", "Credit card"],
                    ["apple_pay", "Phone wallet"],
                    ["google_pay", "Browser wallet"],
                  ] as const
                ).map(([methodId, label]) => (
                  <button
                    key={methodId}
                    type="button"
                    data-testid={`method-${methodId}`}
                    onClick={() => {
                      setMethod(methodId)
                      setError(null)
                    }}
                    className={
                      method === methodId
                        ? "h-11 rounded-lg bg-primary px-2 text-sm text-primary-foreground"
                        : "h-11 rounded-lg bg-muted px-2 text-sm"
                    }
                  >
                    {label}
                  </button>
                ))}
              </div>
              {method === "card" ? (
                <div className="grid gap-3">
                  <div className="grid gap-1">
                    <Label htmlFor="card-number">Card number</Label>
                    <Input
                      id="card-number"
                      data-testid="card-number"
                      inputMode="numeric"
                      autoComplete="cc-number"
                      placeholder="4242 4242 4242 4242"
                      value={cardNumber}
                      className="h-11"
                      onValueChange={setCardNumber}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="grid gap-1">
                      <Label htmlFor="card-expiry">Expiry</Label>
                      <Input
                        id="card-expiry"
                        data-testid="card-expiry"
                        autoComplete="cc-exp"
                        placeholder="12/28"
                        value={expiry}
                        className="h-11"
                        onValueChange={setExpiry}
                      />
                    </div>
                    <div className="grid gap-1">
                      <Label htmlFor="card-cvc">CVC</Label>
                      <Input
                        id="card-cvc"
                        data-testid="card-cvc"
                        inputMode="numeric"
                        autoComplete="cc-csc"
                        placeholder="123"
                        value={cvc}
                        className="h-11"
                        onValueChange={setCvc}
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  A test wallet confirms this deposit without leaving the page.
                </p>
              )}
              {error ? <p className="text-sm text-destructive">{error}</p> : null}
              <Button
                type="button"
                data-testid="submit-payment"
                className="h-12"
                disabled={pending}
                onClick={() => confirmTest(depositMethod(method))}
              >
                {pending ? "Processing" : `Pay ${money(amount)}`}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </article>
  )
}

function methodLabel(method: DepositMethod): string {
  if (method === "apple_pay") return "Phone wallet"
  if (method === "google_pay") return "Browser wallet"
  return "Credit card"
}
