import { NextResponse, type NextRequest } from "next/server"
import { supabaseAuthConfigured } from "@/lib/supabase/env"
import { authClientFromRequest, attachAuthCookies } from "@/lib/supabase/pending-cookies"
import { interpretForgotPassword, recoveryRedirectUrl } from "@/lib/auth/forgot-password-auth"

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

  const pending = authClientFromRequest(request)
  const host = request.headers.get("host") || ""
  const redirectTo = recoveryRedirectUrl(host, new URL(request.url).origin)
  const { error } = await pending.supabase.auth.resetPasswordForEmail(email, { redirectTo })
  const outcome = interpretForgotPassword({
    configured: true,
    error: error ? { message: error.message, status: error.status, code: error.code } : null,
  })

  if (outcome.kind === "rate_limit") {
    return attachAuthCookies(
      NextResponse.json({ ok: false, reason: outcome.reason }, { status: 429 }),
      pending.pending,
      pending.cacheHeaders,
    )
  }

  if (outcome.kind === "error") {
    console.error("Supabase resetPasswordForEmail failed:", error)
    return attachAuthCookies(
      NextResponse.json({ ok: false, reason: outcome.reason }, { status: 500 }),
      pending.pending,
      pending.cacheHeaders,
    )
  }

  return attachAuthCookies(NextResponse.json({ ok: true }), pending.pending, pending.cacheHeaders)
}
