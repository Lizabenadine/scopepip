import type { PlanTier } from "./entitlement.ts"

export interface Tier {
  name: "Starter" | "Pro" | "Business" | "Advanced"
  description: string
  features: string[]
  priceId: { month: string; year: string }
  monthlyPrice: number
  includedSeats: number
  popular?: boolean
  extraSeatAvailable?: boolean
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

export const TIER_COPY: Record<"Starter" | "Pro" | "Business" | "Advanced", {
  description: string
  features: string[]
  monthlyPrice: number
  includedSeats: number
  popular?: boolean
  extraSeatAvailable?: boolean
}> = {
  Starter: {
    monthlyPrice: 29,
    includedSeats: 1,
    description: "For independent painting contractors estimating and running their own jobs.",
    features: [
      "1 included user seat",
      "Mobile room-by-room estimating",
      "Professional proposals & e-signatures",
      "Room-mapped paint buy lists",
      "Sales pipeline & lead tracking",
      "English & Spanish work orders & crew sheets",
      "Sketch & Notes with photo markup",
    ],
  },
  Pro: {
    monthlyPrice: 49,
    includedSeats: 3,
    popular: true,
    description: "For the growing paint business that sells work and schedules crews.",
    features: [
      "Everything in Starter",
      "3 included user seats",
      "Line-item video walkthroughs on proposals",
      "Room-by-room color & sheen sign-offs",
      "Automated proposal email & tracking",
      "Adaptive pricing rate cards",
    ],
  },
  Business: {
    monthlyPrice: 79,
    includedSeats: 5,
    extraSeatAvailable: true,
    description: "For established painting contractors scaling volume and crew operations.",
    features: [
      "Everything in Pro",
      "5 included user seats",
      "Option to purchase additional seats",
      "Hands-free Voice-to-Estimate notes",
      "Smart 3-day & 7-day follow-up reminders",
      "Facebook & Instagram Messenger lead capture",
      "Priority contractor support",
    ],
  },
  Advanced: {
    monthlyPrice: 79,
    includedSeats: 5,
    extraSeatAvailable: true,
    description: "For established painting contractors scaling volume and crew operations.",
    features: [
      "Everything in Pro",
      "5 included user seats",
      "Option to purchase additional seats",
      "Hands-free Voice-to-Estimate notes",
      "Smart 3-day & 7-day follow-up reminders",
      "Facebook & Instagram Messenger lead capture",
    ],
  },
}

/** Plans restored on /pricing. Starter, Pro, and Business are all live. */
export const VISIBLE_TIERS: ("Starter" | "Pro" | "Business")[] = ["Starter", "Pro", "Business"]

const PRICE_KEYS: Record<"Starter" | "Pro" | "Business" | "Advanced", { month: string; year: string; altMonth?: string; altYear?: string }> = {
  Starter: { month: "PADDLE_PRICE_STARTER_MONTH", year: "PADDLE_PRICE_STARTER_YEAR" },
  Pro: { month: "PADDLE_PRICE_PRO_MONTH", year: "PADDLE_PRICE_PRO_YEAR" },
  Business: {
    month: "PADDLE_PRICE_BUSINESS_MONTH",
    year: "PADDLE_PRICE_BUSINESS_YEAR",
    altMonth: "PADDLE_PRICE_ADVANCED_MONTH",
    altYear: "PADDLE_PRICE_ADVANCED_YEAR",
  },
  Advanced: {
    month: "PADDLE_PRICE_ADVANCED_MONTH",
    year: "PADDLE_PRICE_ADVANCED_YEAR",
    altMonth: "PADDLE_PRICE_BUSINESS_MONTH",
    altYear: "PADDLE_PRICE_BUSINESS_YEAR",
  },
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
  const proMonth = env[PRICE_KEYS.Pro.month]?.trim()
  const proYear = env[PRICE_KEYS.Pro.year]?.trim()

  const tiers = VISIBLE_TIERS.map((name) => {
    const keys = PRICE_KEYS[name]
    const month = (env[keys.month]?.trim() || (keys.altMonth ? env[keys.altMonth]?.trim() : "")) ?? ""
    const year = (env[keys.year]?.trim() || (keys.altYear ? env[keys.altYear]?.trim() : "")) ?? ""

    if (name !== "Pro") {
      if (month && proMonth && month === proMonth) {
        missing.push(`${keys.month} (cannot reuse Pro price ${proMonth})`)
      }
      if (year && proYear && year === proYear) {
        missing.push(`${keys.year} (cannot reuse Pro price ${proYear})`)
      }
    }

    if (!PRICE.test(month)) missing.push(keys.month)
    if (!PRICE.test(year)) missing.push(keys.year)
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

export function planTierFromPriceId(
  priceId: string,
  env: Record<string, string | undefined> = process.env,
): PlanTier | undefined {
  const norm = priceId.trim()
  if (!norm) return undefined
  if (norm === env.PADDLE_PRICE_STARTER_MONTH?.trim() || norm === env.PADDLE_PRICE_STARTER_YEAR?.trim()) {
    return "starter"
  }
  if (
    norm === env.PADDLE_PRICE_BUSINESS_MONTH?.trim() ||
    norm === env.PADDLE_PRICE_BUSINESS_YEAR?.trim() ||
    norm === env.PADDLE_PRICE_ADVANCED_MONTH?.trim() ||
    norm === env.PADDLE_PRICE_ADVANCED_YEAR?.trim()
  ) {
    return "business"
  }
  if (norm === env.PADDLE_PRICE_PRO_MONTH?.trim() || norm === env.PADDLE_PRICE_PRO_YEAR?.trim()) {
    return "pro"
  }
  return undefined
}

export function isExtraSeatPriceId(
  priceId: string,
  env: Record<string, string | undefined> = process.env,
): boolean {
  const norm = priceId.trim()
  if (!norm) return false
  return norm === env.PADDLE_PRICE_EXTRA_SEAT_MONTH?.trim() || norm === env.PADDLE_PRICE_EXTRA_SEAT_YEAR?.trim()
}
