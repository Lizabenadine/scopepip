import { supabaseServerKey } from "../supabase/admin.ts"
import { authSecret, sessionById } from "./directory.ts"
import { readAllCookies, readCookie, sessionCookie, type OfficeSession } from "./session.ts"
import { readOfficeSession, readSession, signOfficeSession, signSession } from "./session-token.ts"

export type { OfficeSession }

export async function sessionFromRequest(request: Request): Promise<OfficeSession | null> {
  const cookieHeader = request.headers.get("cookie")
  const tokens = readAllCookies(cookieHeader)
  for (const token of tokens) {
    if (!token) continue
    const embedded = readOfficeSession(token, authSecret())
    if (embedded) return embedded
    const userId = readSession(token, authSecret())
    if (userId) {
      const session = await sessionById(userId)
      if (session) return session
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
