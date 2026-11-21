import { supabaseServerKey } from "../supabase/admin.ts"
import { authSecret, isMasterAdmin, sessionByEmail, sessionById } from "./directory.ts"
import { readAllCookies, readCookie, sessionCookie, type OfficeSession } from "./session.ts"
import { readOfficeSession, readSession, signOfficeSession, signSession } from "./session-token.ts"
import { authClientFromRequest } from "../supabase/pending-cookies.ts"
import { NextRequest } from "next/server.js"

export type { OfficeSession }

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

  // Fallback to Supabase Auth cookies if scopepipe_session is missing
  if (cookieHeader && cookieHeader.includes("sb-")) {
    try {
      const nextReq = request instanceof NextRequest ? request : new NextRequest(request.url, { headers: request.headers })
      const { supabase } = authClientFromRequest(nextReq)
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        let session = await sessionById(user.id)
        if (!session && user.email) {
          session = await sessionByEmail(user.email)
        }
        if (!session && isMasterAdmin({ id: user.id, authUserId: user.id, email: user.email })) {
          session = {
            id: "374258f7-136a-4431-a6af-f81c3a01b48c",
            name: "Nadieshda",
            email: user.email || "nadieshda@aol.com",
            role: "super_admin",
            companyId: "6121f9b9-59df-4190-b4ff-289a062f4c20",
            companyName: "Scopepipe",
            companySlug: "scopepipe",
            planTier: "business",
            extraSeats: 10,
            subscriptionStatus: "lifetime",
            trialEndsAt: "",
            authUserId: user.id,
          }
        }
        if (session && isMasterAdmin(session)) {
          session.role = "super_admin"
          session.subscriptionStatus = "lifetime"
          session.trialEndsAt = ""
          session.companyId = "6121f9b9-59df-4190-b4ff-289a062f4c20"
        }
        return session
      }
    } catch {
      // ignore
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
