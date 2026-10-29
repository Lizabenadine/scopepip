"use client"

import { useEffect, useState } from "react"
import { PLAN_NAME } from "@/lib/defaults"

interface BillingState {
  status: "trialing" | "active" | "canceled"
  trialEndsAt: string | null
  allows: boolean
  checkoutUrl: string | null
}

export function BillingScreen() {
  const [billing, setBilling] = useState<BillingState | null>(null)
  const [note, setNote] = useState("")

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

  useEffect(() => {
    if (!billing?.checkoutUrl) return
    const win = window as Window & { createLemonSqueezy?: () => void }
    const ready = () => win.createLemonSqueezy?.()
    const existing = document.querySelector<HTMLScriptElement>("script[data-lemonsqueezy]")
    if (existing) {
      ready()
      return
    }
    const script = document.createElement("script")
    script.src = "https://assets.lemonsqueezy.com/lemon.js"
    script.defer = true
    script.dataset.lemonsqueezy = "true"
    script.onload = ready
    document.body.appendChild(script)
  }, [billing?.checkoutUrl])

  return (
    <section className="mx-auto flex max-w-xl flex-col gap-4" data-testid="billing-plan">
      <div>
        <p className="text-xs font-semibold tracking-[0.14em] text-muted-foreground uppercase">{PLAN_NAME}</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">Billing</h1>
      </div>
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-lg font-semibold">14-day trial, then a subscription</h2>
        <p className="text-sm text-muted-foreground" data-testid="billing-status">
          {note || statusCopy(billing)}
        </p>
        <ul className="flex flex-col gap-1 text-sm">
          <li>Estimates and the estimator</li>
          <li>Customer proposals, with the link emailed as a PDF</li>
          <li>Crew work orders</li>
          <li>Follow-ups</li>
        </ul>
        {billing?.checkoutUrl ? (
          <a
            className="lemonsqueezy-button inline-flex h-12 items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground"
            data-testid="billing-checkout"
            href={billing.checkoutUrl}
          >
            Subscribe
          </a>
        ) : (
          <button
            type="button"
            className="inline-flex h-12 items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground disabled:opacity-50"
            data-testid="billing-checkout"
            disabled
          >
            Subscribe
          </button>
        )}
        {billing && !billing.checkoutUrl ? (
          <p className="text-sm text-muted-foreground">
            Add the Lemon Squeezy checkout link before Subscribe can open.
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
