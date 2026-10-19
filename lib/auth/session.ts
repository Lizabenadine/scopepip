import type { UserRole } from "./role.ts"

export interface OfficeSession {
  id: string
  name: string
  email: string
  role: UserRole
  companyId: string
  companyName: string
  companySlug: string
}

export const SESSION_COOKIE = "scopepipe_session"

export function sessionCookie(token: string, maxAge = 30 * 24 * 60 * 60): string {
  return `${SESSION_COOKIE}=${token}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${maxAge}`
}

export function readCookie(header: string | null, name = SESSION_COOKIE): string | null {
  if (!header) return null
  for (const part of header.split(";")) {
    const trimmed = part.trim()
    const eq = trimmed.indexOf("=")
    if (eq === -1) continue
    if (trimmed.slice(0, eq) === name) return trimmed.slice(eq + 1)
  }
  return null
}
