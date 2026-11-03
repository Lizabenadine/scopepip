import type { Metadata } from "next"
import { headers } from "next/headers"
import { PricingView } from "@/components/pricing/pricing-view"
import { sessionFromRequest } from "@/lib/auth/request"
import { readPricingCatalog, visitorCountry } from "@/lib/billing/pricing"

export const metadata: Metadata = {
  title: "Pricing",
  description: "Pro plan for painting contractors. Prices are localized for your country.",
}

export default async function PricingPage() {
  const headerList = await headers()
  const countryCode = visitorCountry(headerList.get("x-vercel-ip-country"))
  const session = await sessionFromRequest(
    new Request("https://www.scopepipe.com/pricing", { headers: { cookie: headerList.get("cookie") ?? "" } }),
  )
  const result = readPricingCatalog()
  const email = session?.email.includes("@") ? session.email : undefined
  return (
    <PricingView
      catalog={result.ok ? result.catalog : null}
      configError={result.ok ? null : result.message}
      countryCode={countryCode}
      email={email}
      userId={session ? session.authUserId || session.id : undefined}
      officeUserId={session?.id}
    />
  )
}
