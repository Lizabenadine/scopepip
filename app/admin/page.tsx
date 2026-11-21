import type { Metadata } from "next"
import { cookies, headers } from "next/headers"
import { redirect } from "next/navigation"
import { readOfficeSession, readSession } from "@/lib/auth/session-token"
import { authSecret, isMasterAdmin, sessionByEmail, sessionById } from "@/lib/auth/directory"
import { SESSION_COOKIE, type OfficeSession } from "@/lib/auth/session"
import { MasterAdminPanel } from "@/components/settings/master-admin-panel"
import { authClientFromRequest } from "@/lib/supabase/pending-cookies"
import { NextRequest } from "next/server"

export const metadata: Metadata = {
  title: "Master Admin | Scopepipe",
}

export const dynamic = "force-dynamic"

export default async function AdminPage() {
  const cookieStore = await cookies()
  const token = cookieStore.get(SESSION_COOKIE)?.value
  let session: OfficeSession | null = null

  if (token) {
    session = readOfficeSession(token, authSecret())
    if (!session) {
      const userId = readSession(token, authSecret())
      if (userId) {
        session = await sessionById(userId)
      }
    }
  }

  if (!session) {
    const headerList = await headers()
    const cookieHeader = headerList.get("cookie") || ""
    if (cookieHeader.includes("sb-")) {
      try {
        const dummyReq = new NextRequest("https://www.scopepipe.com/admin", {
          headers: headerList,
        })
        const { supabase } = authClientFromRequest(dummyReq)
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          const byId = await sessionById(user.id)
          session = byId || (user.email ? await sessionByEmail(user.email) : null)
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
        }
      } catch {
        // ignore
      }
    }
  }

  if (session && isMasterAdmin(session)) {
    session.role = "super_admin"
    session.subscriptionStatus = "lifetime"
    session.trialEndsAt = ""
    session.companyId = "6121f9b9-59df-4190-b4ff-289a062f4c20"
  }

  if (!session) {
    redirect("/login?from=/admin")
  }

  if (session.role !== "super_admin" && !isMasterAdmin(session)) {
    redirect("/dashboard")
  }

  return (
    <div className="mx-auto max-w-6xl p-4 sm:p-6 lg:p-8">
      <MasterAdminPanel />
    </div>
  )
}
