import type { SubscriptionStatus } from "../billing/access.ts"
import type { FieldLanguage } from "../field/language.ts"
import type { UserRole } from "./role.ts"

export interface OfficeSession {
  id: string
  name: string
  email: string
  role: UserRole
  companyId: string
  companyName: string
  companySlug: string
  /** Saved on the account after this person chooses English or Español. */
  language?: FieldLanguage
  subscriptionStatus?: SubscriptionStatus
  trialEndsAt?: string
  /** Supabase auth user, when this account was created with email sign-up. */
  authUserId?: string
}

export const SESSION_COOKIE = "scopepipe_session"

export function sessionCookie(
  token: string,
  maxAge = 30 * 24 * 60 * 60,
  options?: { domain?: string; secure?: boolean },
): string {
  const parts = [`${SESSION_COOKIE}=${token}`, "HttpOnly", "Path=/", "SameSite=Lax", `Max-Age=${maxAge}`]
  const isSecure = options?.secure ?? (process.env.NODE_ENV === "production" || Boolean(process.env.VERCEL))
  if (isSecure) parts.push("Secure")
  if (options?.domain) parts.push(`Domain=${options.domain}`)
  return parts.join("; ")
}

export function readAllCookies(header: string | null, name = SESSION_COOKIE): string[] {
  if (!header) return []
  const values: string[] = []
  for (const part of header.split(";")) {
    const trimmed = part.trim()
    const eq = trimmed.indexOf("=")
    if (eq === -1) continue
    if (trimmed.slice(0, eq) === name) {
      const val = trimmed.slice(eq + 1).trim()
      if (val) values.push(val)
    }
  }
  return values
}

export function readCookie(header: string | null, name = SESSION_COOKIE): string | null {
  const all = readAllCookies(header, name)
  return all.length > 0 ? all[0] : null
}
