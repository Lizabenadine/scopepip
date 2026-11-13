"use client"

import { useEffect, useState } from "react"
import { openPaddleCheckout } from "@/components/billing/open-paddle-checkout"
import { PLAN_NAME } from "@/lib/defaults"
import type { PaddleCheckout } from "@/lib/billing/paddle-checkout"

interface BillingState {
  status: "trialing" | "active" | "canceled"
  trialEndsAt: string | null
  allows: boolean
  planTier?: "starter" | "pro" | "business"
  extraSeats?: number
  paddle: PaddleCheckout | null
}

export function BillingScreen() {
  const [billing, setBilling] = useState<BillingState | null>(null)
  const [note, setNote] = useState("")
  const [opening, setOpening] = useState(false)

  useEffect(() => {
    void fetch("/api/billing")
      .then(async (response) => {
        const body = (await response.json().catch(() => null)) as (BillingState & { reason?: string }) | null
        if (!response.ok || !body?.status) {
          setNote(body?.reason || "Billing could not be loaded.")
          return
        }
        setBilling(body)
      })
      .catch(() => setNote("Billing could not be loaded."))
  }, [])

  const paddle = billing?.paddle ?? null
  const tier = billing?.planTier || "pro"
  const planName = tier === "starter" ? "Starter" : tier === "business" ? "Business" : "Pro"
  const planPrice = tier === "starter" ? "$29" : tier === "business" ? "$79" : "$49"
  const seatCount = tier === "starter" ? 1 : tier === "business" ? 5 + (billing?.extraSeats || 0) : 3

  return (
    <section className="mx-auto flex max-w-xl flex-col gap-4" data-testid="billing-plan">
      <div>
        <p className="text-xs font-semibold tracking-[0.14em] text-muted-foreground uppercase">{PLAN_NAME}</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">Billing</h1>
      </div>
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold">{planName} Plan · {planPrice}/mo</h2>
          <span className="rounded-full bg-cyan-50 px-2.5 py-0.5 text-xs font-semibold text-cyan-800 border border-cyan-200">
            {seatCount} {seatCount === 1 ? "seat" : "seats"} included
          </span>
        </div>
        <p className="text-sm text-muted-foreground" data-testid="billing-status">
          {note || statusCopy(billing)}
        </p>
        <ul className="flex flex-col gap-1 text-sm text-slate-700">
          <li>✓ Mobile room-by-room estimating</li>
          <li>✓ Customer proposals with electronic signatures</li>
          <li>✓ English & Spanish crew work orders & buy lists</li>
          <li>✓ Sketch & Notes with photo markup</li>
          {tier === "pro" || tier === "business" ? <li>✓ Line-item video walkthroughs</li> : null}
          {tier === "business" ? (
            <>
              <li>✓ Hands-free Voice-to-Estimate notes</li>
              <li>✓ Smart 3-day & 7-day follow-up reminders</li>
              <li>✓ Facebook & Instagram Messenger lead capture</li>
            </>
          ) : null}
        </ul>
        <button
          type="button"
          className="inline-flex h-12 items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground disabled:opacity-50"
          data-testid="billing-checkout"
          disabled={!paddle || opening}
          onClick={() => {
            if (!paddle) return
            setOpening(true)
            setNote("")
            void openPaddleCheckout(paddle)
              .catch(() => setNote("Checkout could not open."))
              .finally(() => setOpening(false))
          }}
        >
          {opening ? "Opening checkout" : `Subscribe for ${planPrice}/mo`}
        </button>
        <a
          href="/pricing"
          className="inline-flex h-12 items-center justify-center rounded-lg border border-slate-200 px-4 text-sm font-medium hover:bg-slate-50 text-center"
        >
          View all plans (Starter $29, Pro $49, Business $79)
        </a>
        <form action="/api/billing/portal" method="post">
          <button
            type="submit"
            className="inline-flex h-12 w-full items-center justify-center rounded-lg border border-slate-200 px-4 text-sm font-medium"
            data-testid="billing-portal"
          >
            Manage payment method and invoices
          </button>
        </form>
        {billing && !paddle ? (
          <p className="text-sm text-muted-foreground">
            Subscribe opens after the checkout token and plan prices are configured.
          </p>
        ) : null}
      </div>
    </section>
  )
}

function statusCopy(billing: BillingState | null): string {
  if (!billing) return "Loading the subscription."
  if (billing.status === "active") return "This subscription is active. The estimator and dashboard stay open."
  if (billing.status === "canceled") return "This subscription is canceled. Subscribe to open the estimator and dashboard again."
  const ends = billing.trialEndsAt ? new Date(billing.trialEndsAt) : null
  const when = ends && !Number.isNaN(ends.getTime())
    ? new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(ends)
    : ""
  return when
    ? `The trial ends ${when}. The estimator and dashboard stay open until then.`
    : "The trial is open. The estimator and dashboard stay open until it ends."
}
