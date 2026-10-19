import { authSecret, sessionById } from "./directory.ts"
import { readCookie, sessionCookie, type OfficeSession } from "./session.ts"
import { readSession, signSession } from "./session-token.ts"

export type { OfficeSession }

export function sessionFromRequest(request: Request): OfficeSession | null {
  const token = readCookie(request.headers.get("cookie"))
  if (!token) return null
  const userId = readSession(token, authSecret())
  if (!userId) return null
  return sessionById(userId)
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
