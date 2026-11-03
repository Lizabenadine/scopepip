import Link from "next/link"
import { BrandLogo } from "@/components/brand/brand-logo"
import { SiteFooter } from "@/components/marketing/site-footer"
import { PricingPlans } from "@/components/pricing/pricing-plans"
import { TIER_COPY, VISIBLE_TIERS, type PricingCatalog } from "@/lib/billing/pricing"

export function PricingView({
  catalog,
  configError,
  countryCode,
  email,
  userId,
  officeUserId,
}: {
  catalog: PricingCatalog | null
  configError: string | null
  countryCode?: string
  email?: string
  userId?: string
  officeUserId?: string
}) {
  return (
    <div className="min-h-dvh bg-[#0B0F17] text-white">
      <header className="border-b border-white/10 bg-[#02182F]">
        <div className="mx-auto flex min-h-16 max-w-6xl items-center justify-between gap-4 px-4 py-2 md:px-6">
          <BrandLogo href="/" />
          <Link href="/login" className="text-sm font-medium text-slate-300 hover:text-white">
            Sign In
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-12 md:px-6 md:py-16">
        <p className="text-sm font-medium text-cyan-300">Pricing</p>
        <h1 className="mt-3 text-4xl font-bold tracking-tight md:text-5xl">{VISIBLE_TIERS.join(", ")}</h1>
        <p className="mt-5 max-w-2xl text-lg leading-relaxed text-slate-300">
          Prices include the tax Paddle calculates for your country. Switch monthly or yearly, then subscribe on the price shown.
        </p>
        {configError ? (
          <p className="mt-8 rounded-2xl border border-amber-300/40 bg-amber-300/10 p-4 text-sm text-amber-100" data-testid="pricing-config-error">
            {configError}
          </p>
        ) : null}
        {catalog ? (
          <PricingPlans
            environment={catalog.environment}
            token={catalog.token}
            tiers={catalog.tiers}
            countryCode={countryCode}
            email={email}
            userId={userId}
            officeUserId={officeUserId}
          />
        ) : (
          <div className="mt-10">
          <div className="flex justify-center" role="group" aria-label="Billing interval">
            <div className="inline-flex rounded-full border border-white/15 p-1">
              <button type="button" className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-950" aria-pressed="true" disabled>Monthly</button>
              <button type="button" className="rounded-full px-4 py-2 text-sm font-semibold text-slate-300" aria-pressed="false" disabled>Yearly</button>
            </div>
          </div>
          <div className={VISIBLE_TIERS.length === 1 ? "mx-auto mt-8 max-w-md" : "mt-8 grid gap-4 lg:grid-cols-3"}>
            {VISIBLE_TIERS.map((name) => (
              <article key={name} className="flex flex-col rounded-3xl border border-white/10 bg-white/5 p-6" data-testid={`pricing-tier-${name.toLowerCase()}`}>
                <h2 className="text-xl font-semibold">{name}</h2>
                <p className="mt-2 text-sm leading-relaxed text-slate-300">{TIER_COPY[name].description}</p>
                <p className="mt-6 text-sm text-slate-400">Price unavailable</p>
                <ul className="mt-6 flex-1 space-y-2 text-sm">
                  {TIER_COPY[name].features.map((feature) => (
                    <li key={feature}>✓ {feature}</li>
                  ))}
                </ul>
                <button type="button" className="mt-6 inline-flex h-12 items-center justify-center rounded-full bg-cyan-500 px-4 text-sm font-semibold text-slate-950 disabled:opacity-50" disabled>
                  Subscribe
                </button>
              </article>
            ))}
          </div>
          </div>
        )}
      </main>
      <SiteFooter />
    </div>
  )
}
