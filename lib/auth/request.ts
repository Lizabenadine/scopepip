import { supabaseServerKey } from "../supabase/admin.ts"
import { authSecret, isMasterAdmin, sessionByEmail, sessionById } from "./directory.ts"
import { readAllCookies, readCookie, sessionCookie, type OfficeSession } from "./session.ts"
import { readOfficeSession, readSession, signOfficeSession, signSession } from "./session-token.ts"

export type { OfficeSession }

function emailFromSupabaseCookie(cookieHeader: string | null): string | null {
  if (!cookieHeader) return null
  const cookies = cookieHeader.split(";")
  for (const cookie of cookies) {
    const trimmed = cookie.trim()
    const eq = trimmed.indexOf("=")
    if (eq === -1) continue
    const name = trimmed.slice(0, eq).trim()
    const val = trimmed.slice(eq + 1).trim()
    if (name.startsWith("sb-") && name.endsWith("-auth-token") && val.startsWith("base64-")) {
      try {
        const rawJson = Buffer.from(val.slice(7), "base64").toString("utf8")
        const parsed = JSON.parse(rawJson) as { user?: { email?: string } }
        const email = parsed?.user?.email
        if (typeof email === "string" && email.includes("@")) {
          return email.trim().toLowerCase()
        }
      } catch {}
    }
  }
  return null
}

export async function sessionFromRequest(request: Request): Promise<OfficeSession | null> {
  const cookieHeader = request.headers.get("cookie")
  const tokens = readAllCookies(cookieHeader)
  for (const token of tokens) {
    if (!token) continue
    const embedded = readOfficeSession(token, authSecret())
    if (embedded) {
      if (isMasterAdmin(embedded)) {
        embedded.role = "super_admin"
        embedded.subscriptionStatus = "lifetime"
        embedded.trialEndsAt = ""
        if (!embedded.companyId || embedded.companyId === embedded.id) {
          embedded.companyId = "6121f9b9-59df-4190-b4ff-289a062f4c20"
        }
      }
      return embedded
    }
    const userId = readSession(token, authSecret())
    if (userId) {
      const session = await sessionById(userId)
      if (session) {
        if (isMasterAdmin(session)) {
          session.role = "super_admin"
          session.subscriptionStatus = "lifetime"
          session.trialEndsAt = ""
          if (!session.companyId || session.companyId === session.id) {
            session.companyId = "6121f9b9-59df-4190-b4ff-289a062f4c20"
          }
        }
        return session
      }
    }
  }

  const supabaseEmail = emailFromSupabaseCookie(cookieHeader)
  if (supabaseEmail) {
    const session = await sessionByEmail(supabaseEmail)
    if (session) {
      if (isMasterAdmin(session)) {
        session.role = "super_admin"
        session.subscriptionStatus = "lifetime"
        session.trialEndsAt = ""
        if (!session.companyId || session.companyId === session.id) {
          session.companyId = "6121f9b9-59df-4190-b4ff-289a062f4c20"
        }
      }
      return session
    }
  }

  return null
}

export function jsonWithOfficeSession(session: OfficeSession, body: unknown, status = 200): Response {
  return Response.json(body, {
    status,
    headers: { "set-cookie": sessionCookie(signOfficeSession(session, authSecret())) },
  })
}

export function jsonWithSession(userId: string, body: unknown, status = 200): Response {
  return Response.json(body, {
    status,
    headers: { "set-cookie": sessionCookie(signSession(userId, authSecret())) },
  })
}

export function clearSession(body: unknown): Response {
  return Response.json(body, { headers: { "set-cookie": sessionCookie("", 0) } })
}
