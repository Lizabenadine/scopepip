import { createHmac, timingSafeEqual } from "node:crypto"
import type { OfficeSession } from "./session.ts"

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

export function signOfficeSession(session: OfficeSession, secret: string, now = Date.now()): string {
  const body = Buffer.from(JSON.stringify({ session, exp: now + TTL_MS })).toString("base64url")
  const sig = createHmac("sha256", secret).update(body).digest("base64url")
  return `v2.${body}.${sig}`
}

export function readOfficeSession(token: string, secret: string, now = Date.now()): OfficeSession | null {
  if (!token.startsWith("v2.")) return null
  const [, body, sig] = token.split(".")
  if (!body || !sig) return null
  const expected = createHmac("sha256", secret).update(body).digest("base64url")
  const actual = Buffer.from(sig)
  const wanted = Buffer.from(expected)
  if (actual.length !== wanted.length || !timingSafeEqual(actual, wanted)) return null
  try {
    const parsed = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as { session?: OfficeSession; exp?: number }
    if (!parsed.session || typeof parsed.exp !== "number" || parsed.exp < now) return null
    const session = parsed.session
    if (!session.id || !session.email || !session.companyId || !session.companyName) return null
    return session
  } catch {
    return null
  }
}
