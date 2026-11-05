import { NextResponse, type NextRequest } from "next/server"
import { supabaseAuthConfigured } from "@/lib/supabase/env"
import { authClientFromRequest, attachAuthCookies } from "@/lib/supabase/pending-cookies"
import { updateUserPassword } from "@/lib/auth/directory"

export const runtime = "nodejs"

export async function POST(request: NextRequest) {
  if (!supabaseAuthConfigured()) {
    return NextResponse.json({ ok: false, reason: "Supabase Auth is not configured." }, { status: 503 })
  }

  const body = (await request.json().catch(() => null)) as { password?: string } | null
  const password = typeof body?.password === "string" ? body.password : ""
  if (password.length < 8) {
    return NextResponse.json({ ok: false, reason: "Use at least 8 characters." }, { status: 400 })
  }

  const pending = authClientFromRequest(request)
  const { data, error } = await pending.supabase.auth.getUser()

  if (error || !data.user?.email) {
    return attachAuthCookies(
      NextResponse.json({ ok: false, reason: "Auth session missing or expired." }, { status: 401 }),
      pending.pending,
      pending.cacheHeaders,
    )
  }

  await updateUserPassword(data.user.email, password)

  return attachAuthCookies(NextResponse.json({ ok: true }), pending.pending, pending.cacheHeaders)
}
