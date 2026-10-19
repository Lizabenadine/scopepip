import { createHmac, timingSafeEqual } from "node:crypto"

const TTL_MS = 30 * 24 * 60 * 60 * 1000

export function signSession(userId: string, secret: string, now = Date.now()): string {
  const exp = String(now + TTL_MS)
  const body = `${userId}.${exp}`
  const sig = createHmac("sha256", secret).update(body).digest("base64url")
  return `${body}.${sig}`
}

export function readSession(token: string, secret: string, now = Date.now()): string | null {
  const parts = token.split(".")
  if (parts.length !== 3) return null
  const [userId, expRaw, sig] = parts
  if (!userId || !expRaw || !sig) return null
  const exp = Number(expRaw)
  if (!Number.isFinite(exp) || exp < now) return null
  const expected = createHmac("sha256", secret).update(`${userId}.${expRaw}`).digest("base64url")
  const actual = Buffer.from(sig)
  const wanted = Buffer.from(expected)
  if (actual.length !== wanted.length || !timingSafeEqual(actual, wanted)) return null
  return userId
}
