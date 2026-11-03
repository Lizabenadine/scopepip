"use client"

import { initializePaddle, type Paddle } from "@paddle/paddle-js"
import { useEffect, useRef, useState } from "react"
import type { BillingInterval, PaddleClientEnvironment, Tier } from "@/lib/billing/pricing"

interface FormattedTotals {
  subtotal: string
  discount: string
  tax: string
  total: string
}

interface PricingPlansProps {
  environment: PaddleClientEnvironment
  token: string
  tiers: Tier[]
  countryCode?: string
  email?: string
  userId?: string
  officeUserId?: string
}

export function PricingPlans({
  environment,
  token,
  tiers,
  countryCode,
  email,
  userId,
  officeUserId,
}: PricingPlansProps) {
  const paddleRef = useRef<Paddle | undefined>(undefined)
  const [interval, setInterval] = useState<BillingInterval>("month")
  const [prices, setPrices] = useState<Record<string, FormattedTotals | { error: string }>>({})
  const [loadError, setLoadError] = useState("")
  const [opening, setOpening] = useState("")
  const [note, setNote] = useState("")

  useEffect(() => {
    let cancel = false
    const priceIds = tiers.flatMap((tier) => [tier.priceId.month, tier.priceId.year])
    void initializePaddle({ environment, token }).then(async (paddle) => {
      if (cancel) return
      if (!paddle) {
        setLoadError("Paddle checkout did not load.")
        return
      }
      paddleRef.current = paddle
      const next: Record<string, FormattedTotals | { error: string }> = {}
      await Promise.all(
        priceIds.map(async (priceId) => {
          try {
            const preview = await paddle.PricePreview({
              items: [{ priceId, quantity: 1 }],
              ...(countryCode ? { address: { countryCode } } : {}),
            })
            const totals = preview.data.details.lineItems[0]?.formattedTotals
            if (!totals?.total) {
              next[priceId] = { error: "Paddle did not return a total for this price." }
              return
            }
            next[priceId] = {
              subtotal: totals.subtotal,
              discount: totals.discount,
              tax: totals.tax,
              total: totals.total,
            }
          } catch {
            next[priceId] = { error: "This price could not be loaded." }
          }
        }),
      )
      if (!cancel) setPrices(next)
    })
    return () => {
      cancel = true
    }
  }, [countryCode, environment, tiers, token])

  function subscribe(tier: Tier) {
    const paddle = paddleRef.current
    const priceId = tier.priceId[interval]
    if (!paddle || !prices[priceId] || "error" in prices[priceId]) return
    setOpening(tier.name)
    setNote("")
    try {
      paddle.Checkout.open({
        items: [{ priceId, quantity: 1 }],
        ...(email ? { customer: { email } } : {}),
        ...(userId && officeUserId ? { customData: { user_id: userId, office_user_id: officeUserId } } : {}),
        settings: {
          displayMode: "overlay",
          variant: "one-page",
          successUrl: `${window.location.origin}/welcome`,
        },
      })
    } catch {
      setNote("Checkout could not open.")
    } finally {
      setOpening("")
    }
  }

  return (
    <div className="mt-10">
      <div className="flex justify-center" role="group" aria-label="Billing interval">
        <div className="inline-flex rounded-full border border-white/15 p-1">
          <IntervalButton current={interval} value="month" onSelect={setInterval}>
            Monthly
          </IntervalButton>
          <IntervalButton current={interval} value="year" onSelect={setInterval}>
            Yearly
          </IntervalButton>
        </div>
      </div>
      {loadError || note ? <p className="mt-6 text-center text-sm text-amber-200">{loadError || note}</p> : null}
      <div className={tiers.length === 1 ? "mx-auto mt-8 max-w-md" : "mt-8 grid gap-4 lg:grid-cols-3"}>
        {tiers.map((tier) => {
          const priceId = tier.priceId[interval]
          const shown = prices[priceId]
          const ready = Boolean(shown && !("error" in shown))
          return (
            <article key={tier.name} className="flex flex-col rounded-3xl border border-white/10 bg-white/5 p-6" data-testid={`pricing-tier-${tier.name.toLowerCase()}`}>
              <h2 className="text-xl font-semibold">{tier.name}</h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-300">{tier.description}</p>
              <div className="mt-6 min-h-24" data-testid={`pricing-price-${tier.name.toLowerCase()}`}>
                {!shown ? <p className="text-sm text-slate-400">Loading the price…</p> : null}
                {shown && "error" in shown ? <p className="text-sm text-amber-200">{shown.error}</p> : null}
                {shown && !("error" in shown) ? (
                  <>
                    <p className="text-4xl font-semibold tracking-tight">{shown.total}</p>
                    <p className="mt-1 text-sm text-slate-400">{interval === "month" ? "per month" : "per year"}</p>
                    <ul className="mt-3 space-y-1 text-sm text-slate-300">
                      <li>Subtotal {shown.subtotal}</li>
                      <li>Discount {shown.discount}</li>
                      <li>Tax {shown.tax}</li>
                    </ul>
                  </>
                ) : null}
              </div>
              <ul className="mt-6 flex-1 space-y-2 text-sm">
                {tier.features.map((feature) => (
                  <li key={feature}>✓ {feature}</li>
                ))}
              </ul>
              <button
                type="button"
                className="mt-6 inline-flex h-12 items-center justify-center rounded-full bg-cyan-500 px-4 text-sm font-semibold text-slate-950 hover:bg-cyan-400 disabled:opacity-50"
                data-testid={`pricing-subscribe-${tier.name.toLowerCase()}`}
                disabled={!ready || opening === tier.name}
                onClick={() => subscribe(tier)}
              >
                {opening === tier.name ? "Opening checkout" : "Subscribe"}
              </button>
            </article>
          )
        })}
      </div>
    </div>
  )
}

function IntervalButton({
  current,
  value,
  onSelect,
  children,
}: {
  current: BillingInterval
  value: BillingInterval
  onSelect: (value: BillingInterval) => void
  children: string
}) {
  const selected = current === value
  return (
    <button
      type="button"
      aria-pressed={selected}
      data-testid={`billing-interval-${value}`}
      className={selected ? "rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-950" : "rounded-full px-4 py-2 text-sm font-semibold text-slate-300"}
      onClick={() => onSelect(value)}
    >
      {children}
    </button>
  )
}
