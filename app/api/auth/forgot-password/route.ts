import { NextResponse, type NextRequest } from "next/server"
import { supabaseAuthConfigured } from "@/lib/supabase/env"
import { authClientFromRequest, attachAuthCookies } from "@/lib/supabase/pending-cookies"

export const runtime = "nodejs"

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as { email?: string } | null
  const email = typeof body?.email === "string" ? body.email.trim() : ""
  if (!email.includes("@")) {
    return NextResponse.json({ ok: false, reason: "Enter your email address." }, { status: 400 })
  }
  if (!supabaseAuthConfigured()) {
    return NextResponse.json({ ok: true })
  }
  const origin = (request.headers.get("origin") || new URL(request.url).origin).replace(/\/$/, "")
  const redirectTo = `${origin}/auth/callback?type=recovery`
  const pending = authClientFromRequest(request)
  await pending.supabase.auth.resetPasswordForEmail(email, { redirectTo })
  return attachAuthCookies(NextResponse.json({ ok: true }), pending.pending, pending.cacheHeaders)
}
