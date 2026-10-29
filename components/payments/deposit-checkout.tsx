"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { PaintRoller } from "lucide-react"
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
import { useScope } from "@/lib/data/store"
import { calculateEstimate } from "@/lib/estimate/calculate"
import { money } from "@/lib/format"
import { depositAmount, depositMethod, clampDepositPercent, type PaymentIntentPayload } from "@/lib/payments/deposit"
import type { DepositMethod, DepositReceipt, Estimate, PaymentMethod } from "@/lib/types"

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

export function DepositCheckout({ id }: { id: string }) {
  const scope = useScope()
  const [estimate, setEstimate] = useState<Estimate | null>(null)
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([])
  const [clientName, setClientName] = useState("Client")
  const [missing, setMissing] = useState(false)
  const [open, setOpen] = useState(false)
  const [intent, setIntent] = useState<IntentResponse | null>(null)
  const [method, setMethod] = useState<DepositMethod>("card")
  const [cardNumber, setCardNumber] = useState("")
  const [expiry, setExpiry] = useState("")
  const [cvc, setCvc] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  useEffect(() => {
    let cancelled = false
    void fetch(`/api/public/estimates/${encodeURIComponent(id)}`)
      .then(async (response) => {
        if (!response.ok) {
          if (!cancelled) setMissing(true)
          return
        }
        const payload = (await response.json()) as { estimate?: Estimate; clientName?: string; paymentMethods?: PaymentMethod[] }
        if (cancelled || !payload.estimate) return
        setEstimate(payload.estimate)
        setClientName(payload.clientName || "Client")
        setPaymentMethods(payload.paymentMethods ?? [])
      })
      .catch(() => {
        if (!cancelled) setMissing(true)
      })
    return () => {
      cancelled = true
    }
  }, [id])

  if (!estimate && !missing) {
    return <div className="h-40 animate-pulse rounded-2xl bg-muted" aria-hidden />
  }
  if (!estimate) {
    return (
      <div className="rounded-2xl border border-dashed border-border px-4 py-12 text-center">
        <h1 className="text-xl font-semibold">This estimate isn&apos;t on this device</h1>
      </div>
    )
  }

  const quote = calculateEstimate({
    areas: estimate.areas,
    lineItems: estimate.lineItems,
    rates: estimate.rates,
    settings: estimate.settings,
    paymentMethods,
  })
  const percent = clampDepositPercent(estimate.settings.depositPercent)
  const amount = depositAmount(quote.total, percent)
  const paid = estimate.paymentStatus === "deposit_paid" && estimate.depositReceipt

  const openCheckout = async () => {
    setError(null)
    setPending(true)
    const response = await fetch("/api/payments/create-intent", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ estimateId: estimate.id, total: quote.total, depositPercent: percent }),
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
    const response = await fetch(`/api/public/estimates/${encodeURIComponent(estimate.id)}/deposit`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(receipt),
    })
    const result = (await response.json()) as { ok?: boolean; reason?: string; estimate?: Estimate }
    if (!response.ok || !result.ok || !result.estimate) {
      setError(result.reason || "The deposit was not recorded.")
      return
    }
    setEstimate(result.estimate)
    if (scope.session) await scope.reloadBook()
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
      <header className="flex items-center gap-3">
        <span className="flex size-11 items-center justify-center rounded-xl bg-primary text-primary-foreground">
          <PaintRoller className="size-5" />
        </span>
        <div>
          <p className="text-lg font-semibold tracking-tight">
            Scope<span className="text-primary">Pipe</span>
          </p>
          <p className="text-xs text-muted-foreground">Job deposit</p>
        </div>
      </header>
      <div>
        <h1 className="font-display text-4xl leading-none tracking-tight">{estimate.title}</h1>
        <p className="mt-3 text-sm">{clientName}</p>
        <p className="text-sm text-muted-foreground">{estimate.jobAddress}</p>
      </div>
      <section className="rounded-2xl bg-card p-4 ring-1 ring-foreground/10">
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
          <p data-testid="deposit-amount" className="font-display text-4xl text-price tabular-nums">
            {money(amount)}
          </p>
        </div>
      </section>
      <PendingWork
        estimate={estimate}
        onSigned={(next) => {
          setEstimate(next)
          if (scope.session) void scope.reloadBook()
        }}
      />
      {estimate.clientStatus !== "accepted" ? (
        <div className="rounded-2xl border border-dashed border-border px-4 py-6 text-center">
          <p className="font-medium">Accept the proposal before paying the deposit.</p>
          <Link href={`/p/${estimate.publicToken}`} className="mt-3 inline-block text-sm font-medium text-primary">
            Open the proposal
          </Link>
        </div>
      ) : paid && estimate.depositReceipt ? (
        <section data-testid="deposit-status" className="rounded-2xl bg-card p-4 ring-1 ring-foreground/10">
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
        </section>
      ) : (
        <div className="flex flex-col gap-3">
          {error && !open ? <p className="text-sm text-destructive">{error}</p> : null}
          <Button type="button" data-testid="pay-deposit" className="h-12" disabled={pending} onClick={openCheckout}>
            Pay {money(amount)} deposit
          </Button>
        </div>
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Pay deposit</DialogTitle>
            <DialogDescription>
              {money(amount)} by card, Apple Pay, or Google Pay.
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
                    ["apple_pay", "Apple Pay"],
                    ["google_pay", "Google Pay"],
                  ] as const
                ).map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    data-testid={`method-${id}`}
                    onClick={() => {
                      setMethod(id)
                      setError(null)
                    }}
                    className={
                      method === id
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
                  Test {method === "apple_pay" ? "Apple Pay" : "Google Pay"} confirms this deposit without leaving the page.
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
  if (method === "apple_pay") return "Apple Pay"
  if (method === "google_pay") return "Google Pay"
  return "Credit card"
}
