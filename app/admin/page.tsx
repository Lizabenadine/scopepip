import type { Metadata } from "next"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { readOfficeSession } from "@/lib/auth/session-token"
import { authSecret, isMasterAdmin } from "@/lib/auth/directory"
import { SESSION_COOKIE } from "@/lib/auth/session"
import { MasterAdminPanel } from "@/components/settings/master-admin-panel"

export const metadata: Metadata = {
  title: "Master Admin | Scopepipe",
}

export default async function AdminPage() {
  const cookieStore = await cookies()
  const token = cookieStore.get(SESSION_COOKIE)?.value
  const session = token ? readOfficeSession(token, authSecret()) : null

  if (!session || (session.role !== "super_admin" && !isMasterAdmin(session))) {
    redirect("/dashboard")
  }

  return (
    <div className="mx-auto max-w-6xl p-4 sm:p-6 lg:p-8">
      <MasterAdminPanel />
    </div>
  )
}
