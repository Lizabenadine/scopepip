import { createHmac, timingSafeEqual } from "node:crypto"

const DEV_SECRET = "scopepipe-local-deposit"

export interface IssuedIntent {
  id: string
  estimateId: string
  amountCents: number
  depositPercent: number
  total: number
}

export function signTestIntent(intent: IssuedIntent): string {
  const body = Buffer.from(JSON.stringify(intent)).toString("base64url")
  const signature = createHmac("sha256", DEV_SECRET).update(body).digest("base64url")
  return `${body}.${signature}`
}

export function verifyTestIntent(token: string | undefined): IssuedIntent | null {
  if (!token) return null
  const splitAt = token.lastIndexOf(".")
  if (splitAt <= 0) return null
  const body = token.slice(0, splitAt)
  const signature = token.slice(splitAt + 1)
  const expected = createHmac("sha256", DEV_SECRET).update(body).digest("base64url")
  const left = Buffer.from(signature)
  const right = Buffer.from(expected)
  if (left.length !== right.length || !timingSafeEqual(left, right)) return null
  try {
    return JSON.parse(Buffer.from(body, "base64url").toString()) as IssuedIntent
  } catch {
    return null
  }
}
