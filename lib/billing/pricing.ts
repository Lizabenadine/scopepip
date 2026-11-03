export interface Tier {
  name: "Starter" | "Pro" | "Advanced"
  description: string
  features: string[]
  priceId: { month: string; year: string }
}

export type BillingInterval = "month" | "year"

export type PaddleClientEnvironment = "production" | "sandbox"

export interface PricingCatalog {
  environment: PaddleClientEnvironment
  token: string
  tiers: Tier[]
}

const TOKEN = /^(test|live)_[A-Za-z0-9]{8,}$/
const PRICE = /^pri_[A-Za-z0-9]{8,}$/

export const TIER_COPY: Record<Tier["name"], { description: string; features: string[] }> = {
  Starter: {
    description: "For an owner who writes the bids and sends the proposals.",
    features: ["Room-by-room estimates", "Proposals the customer can sign", "A crew sheet for the job"],
  },
  Pro: {
    description: "For the office that sells the work and schedules the crew.",
    features: [
      "Full access to Scopepipe Beta",
      "3 User seats included",
      "Sales pipeline and jobs board",
      "Bilingual work orders & material takeoffs",
      "Automated follow-ups while proposals are open",
    ],
  },
  Advanced: {
    description: "For a company that invoices the job and asks for the review.",
    features: ["Everything in Pro", "Invoices, deposits, and the balance", "A review link after the job is finished"],
  },
}

/** Plans shown on /pricing. Add "Starter" or "Advanced" here to show them again. */
export const VISIBLE_TIERS: Tier["name"][] = ["Pro"]

const PRICE_KEYS: Record<Tier["name"], { month: string; year: string }> = {
  Starter: { month: "PADDLE_PRICE_STARTER_MONTH", year: "PADDLE_PRICE_STARTER_YEAR" },
  Pro: { month: "PADDLE_PRICE_PRO_MONTH", year: "PADDLE_PRICE_PRO_YEAR" },
  Advanced: { month: "PADDLE_PRICE_ADVANCED_MONTH", year: "PADDLE_PRICE_ADVANCED_YEAR" },
}

export function visitorCountry(header: string | null | undefined): string | undefined {
  const code = header?.trim().toUpperCase() ?? ""
  if (code === "OTHERS" || !/^[A-Z]{2}$/.test(code)) return undefined
  return code
}

export function readPricingCatalog(
  env: Record<string, string | undefined> = process.env,
): { ok: true; catalog: PricingCatalog } | { ok: false; message: string } {
  const raw = env.PADDLE_ENV?.trim()
  if (raw !== "live" && raw !== "sandbox") {
    return { ok: false, message: "PADDLE_ENV must be live or sandbox. Checkout stays closed until that variable is set." }
  }
  const prefix = raw === "live" ? "live_" : "test_"
  const token = (env.PADDLE_CLIENT_TOKEN || env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN || "").trim()
  if (!token.startsWith(prefix) || !TOKEN.test(token)) {
    return {
      ok: false,
      message: `PADDLE_CLIENT_TOKEN must be a ${prefix} token when PADDLE_ENV is ${raw}. Checkout stays closed.`,
    }
  }
  const missing: string[] = []
  const tiers = VISIBLE_TIERS.map((name) => {
    const monthKey = PRICE_KEYS[name].month
    const yearKey = PRICE_KEYS[name].year
    const month = env[monthKey]?.trim() ?? ""
    const year = env[yearKey]?.trim() ?? ""
    if (!PRICE.test(month)) missing.push(monthKey)
    if (!PRICE.test(year)) missing.push(yearKey)
    return { name, ...TIER_COPY[name], priceId: { month, year } }
  })
  if (missing.length > 0) {
    return {
      ok: false,
      message: `Set ${missing.join(", ")} to the live Paddle price ids. Checkout stays closed until those prices are set.`,
    }
  }
  return {
    ok: true,
    catalog: {
      environment: raw === "live" ? "production" : "sandbox",
      token,
      tiers,
    },
  }
}
