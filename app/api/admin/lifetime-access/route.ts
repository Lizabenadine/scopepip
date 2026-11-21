import { NextResponse } from "next/server"
import { sessionFromRequest } from "@/lib/auth/request"
import { isMasterAdmin, listAllAccountsForAdmin, setLifetimeAccess } from "@/lib/auth/directory"

export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  const session = await sessionFromRequest(request)
  if (!session || (session.role !== "super_admin" && !isMasterAdmin(session))) {
    return NextResponse.json({ error: "Forbidden: Master admin access required." }, { status: 403 })
  }

  const users = await listAllAccountsForAdmin(session.id)
  if (!users) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  return NextResponse.json({ ok: true, users })
}

export async function POST(request: Request) {
  const session = await sessionFromRequest(request)
  if (!session || (session.role !== "super_admin" && !isMasterAdmin(session))) {
    return NextResponse.json({ error: "Forbidden: Master admin access required." }, { status: 403 })
  }

  try {
    const body = (await request.json()) as { userId?: string; action?: "grant" | "revoke" }
    const { userId, action } = body
    if (!userId || (action !== "grant" && action !== "revoke")) {
      return NextResponse.json({ error: "Invalid parameters. 'userId' and 'action' (grant | revoke) are required." }, { status: 400 })
    }

    const result = await setLifetimeAccess(session.id, userId, action)
    if (!result.ok) {
      return NextResponse.json({ error: result.reason || "Failed to update lifetime access." }, { status: 400 })
    }

    return NextResponse.json({ ok: true, user: result.user })
  } catch {
    return NextResponse.json({ error: "Invalid request payload." }, { status: 400 })
  }
}
