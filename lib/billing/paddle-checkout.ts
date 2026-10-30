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
  input: { email: string; userId: string; authUserId?: string },
  env: Record<string, string | undefined> = process.env,
): PaddleCheckout | null {
  return paddleCheckout({
    token: env.PADDLE_CLIENT_TOKEN || "",
    priceId: env.PADDLE_PRICE_ID || "",
    email: input.email,
    userId: input.userId,
    authUserId: input.authUserId,
  })
}
