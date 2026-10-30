"use client"

import { useEffect, useState } from "react"
import { openPaddleCheckout } from "@/components/billing/open-paddle-checkout"
import { PLAN_NAME } from "@/lib/defaults"
import type { PaddleCheckout } from "@/lib/billing/paddle-checkout"

interface BillingState {
  status: "trialing" | "active" | "canceled"
  trialEndsAt: string | null
  allows: boolean
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

  return (
    <section className="mx-auto flex max-w-xl flex-col gap-4" data-testid="billing-plan">
      <div>
        <p className="text-xs font-semibold tracking-[0.14em] text-muted-foreground uppercase">{PLAN_NAME}</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">Billing</h1>
      </div>
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-lg font-semibold">14-day trial, then $49 a month</h2>
        <p className="text-sm text-muted-foreground" data-testid="billing-status">
          {note || statusCopy(billing)}
        </p>
        <ul className="flex flex-col gap-1 text-sm">
          <li>Estimates and the estimator</li>
          <li>Customer proposals, with the link emailed as a PDF</li>
          <li>Crew work orders</li>
          <li>Follow-ups</li>
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
              .catch(() => setNote("Paddle checkout could not open."))
              .finally(() => setOpening(false))
          }}
        >
          {opening ? "Opening checkout" : "Subscribe for $49/mo"}
        </button>
        {billing && !paddle ? (
          <p className="text-sm text-muted-foreground">
            Subscribe opens in Paddle after the client token and the $49 price are set.
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
