import { NextResponse, type NextRequest } from "next/server"
import { billingAccessForUser } from "../auth/directory.ts"
import type { OfficeSession } from "../auth/session.ts"
import { sessionFromRequest } from "../auth/request.ts"
import { guardedPath, subscriptionAllows, trialEndsAt, type SubscriptionAccess } from "./access.ts"

export async function billingRedirect(request: NextRequest): Promise<NextResponse | null> {
  if (!guardedPath(request.nextUrl.pathname)) return null
  const session = await sessionFromRequest(request)
  if (!session) return null
  const access = await subscriptionForSession(session)
  if (subscriptionAllows(access, Date.now())) return null
  const url = request.nextUrl.clone()
  url.pathname = "/billing"
  url.search = ""
  return NextResponse.redirect(url)
}

export async function subscriptionForSession(session: OfficeSession): Promise<SubscriptionAccess & { userId: string; email: string; authUserId?: string }> {
  const stored = await billingAccessForUser(session.id)
  if (stored) return stored
  if (session.subscriptionStatus) {
    return {
      status: session.subscriptionStatus,
      trialEndsAt: session.trialEndsAt ?? null,
      userId: session.id,
      email: session.email,
      ...(session.authUserId ? { authUserId: session.authUserId } : {}),
    }
  }
  return {
    status: "trialing",
    trialEndsAt: trialEndsAt(new Date()),
    userId: session.id,
    email: session.email,
  }
}
