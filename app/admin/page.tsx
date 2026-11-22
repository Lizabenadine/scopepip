import type { Metadata } from "next"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { readOfficeSession, readSession } from "@/lib/auth/session-token"
import { authSecret, isMasterAdmin, sessionById } from "@/lib/auth/directory"
import { SESSION_COOKIE, type OfficeSession } from "@/lib/auth/session"
import { MasterAdminPanel } from "@/components/settings/master-admin-panel"

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
