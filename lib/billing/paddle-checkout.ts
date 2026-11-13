import type { PlanTier } from "./entitlement.ts"

export interface PaddleCheckout {
  token: string
  priceId: string
  email: string
  userId: string
  officeUserId: string
}

const TOKEN = /^(test|live)_[A-Za-z0-9]{8,}$/
const PRICE = /^pri_[A-Za-z0-9]{8,}$/

export function paddleCheckout(input: {
  token: string
  priceId: string
  email: string
  userId: string
  authUserId?: string
}): PaddleCheckout | null {
  const token = input.token.trim()
  const priceId = input.priceId.trim()
  const email = input.email.trim()
  const officeUserId = input.userId.trim()
  const userId = (input.authUserId || input.userId).trim()
  if (!TOKEN.test(token) || !PRICE.test(priceId) || !email.includes("@") || !userId || !officeUserId) return null
  return { token, priceId, email, userId, officeUserId }
}

export function paddleCheckoutFromEnv(
  input: {
    email: string
    userId: string
    authUserId?: string
    planTier?: PlanTier
    interval?: "month" | "year"
  },
  env: Record<string, string | undefined> = process.env,
): PaddleCheckout | null {
  const tier = input.planTier || "pro"
  const interval = input.interval || "month"
  let priceId = ""

  if (tier === "starter") {
    priceId = (interval === "year" ? env.PADDLE_PRICE_STARTER_YEAR : env.PADDLE_PRICE_STARTER_MONTH) || ""
  } else if (tier === "business") {
    priceId = (interval === "year" ? env.PADDLE_PRICE_BUSINESS_YEAR : env.PADDLE_PRICE_BUSINESS_MONTH) || ""
  } else {
    priceId =
      (interval === "year" ? env.PADDLE_PRICE_PRO_YEAR : env.PADDLE_PRICE_PRO_MONTH) ||
      env.PADDLE_PRICE_ID ||
      ""
  }

  return paddleCheckout({
    token: env.PADDLE_CLIENT_TOKEN || env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN || "",
    priceId,
    email: input.email,
    userId: input.userId,
    authUserId: input.authUserId,
  })
}

export function extraSeatCheckoutFromEnv(
  input: { email: string; userId: string; authUserId?: string; quantity?: number },
  env: Record<string, string | undefined> = process.env,
): (PaddleCheckout & { quantity: number }) | null {
  const priceId = (env.PADDLE_PRICE_EXTRA_SEAT_MONTH || "").trim()
  const base = paddleCheckout({
    token: env.PADDLE_CLIENT_TOKEN || env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN || "",
    priceId,
    email: input.email,
    userId: input.userId,
    authUserId: input.authUserId,
  })
  if (!base) return null
  return { ...base, quantity: Math.max(1, input.quantity || 1) }
}
