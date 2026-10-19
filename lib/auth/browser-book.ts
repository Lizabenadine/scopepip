import type { OfficeSession } from "./session.ts"
import { isScopeState, type ScopeState } from "../data/seed.ts"

function bookKey(companyId: string): string {
  return `scopepipe.book.${companyId}`
}

function loginKey(email: string): string {
  return `scopepipe.login.${email.trim().toLowerCase()}`
}

export function saveBrowserBook(companyId: string, revision: number, state: ScopeState) {
  if (typeof window === "undefined") return
  localStorage.setItem(bookKey(companyId), JSON.stringify({ revision, state }))
}

export function readBrowserBook(companyId: string): { revision: number; state: ScopeState } | null {
  if (typeof window === "undefined") return null
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(bookKey(companyId)) || "")
    if (!parsed || typeof parsed !== "object") return null
    const record = parsed as { revision?: unknown; state?: unknown }
    if (typeof record.revision !== "number" || !isScopeState(record.state)) return null
    return { revision: record.revision, state: record.state }
  } catch {
    return null
  }
}

export function saveBrowserLogin(user: OfficeSession, passwordHash: string) {
  if (typeof window === "undefined") return
  localStorage.setItem(loginKey(user.email), JSON.stringify({ passwordHash, user }))
}

export function readBrowserLogin(email: string): { passwordHash: string; user: OfficeSession } | null {
  if (typeof window === "undefined") return null
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(loginKey(email)) || "")
    if (!parsed || typeof parsed !== "object") return null
    const record = parsed as { passwordHash?: unknown; user?: OfficeSession }
    if (typeof record.passwordHash !== "string" || !record.user?.id || !record.user.companyId) return null
    return { passwordHash: record.passwordHash, user: record.user }
  } catch {
    return null
  }
}
