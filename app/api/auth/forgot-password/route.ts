import { NextResponse, type NextRequest } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { supabaseAuthConfigured, supabaseBrowserUrl, supabasePublishableKey } from "@/lib/supabase/env"
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

  const supabase = createClient(supabaseBrowserUrl(), supabasePublishableKey(), {
    auth: {
      flowType: "implicit",
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  })
  const host = request.headers.get("host") || ""
  const redirectTo = recoveryRedirectUrl(host, new URL(request.url).origin)
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo })
  const outcome = interpretForgotPassword({
    configured: true,
    error: error ? { message: error.message, status: error.status, code: error.code } : null,
  })

  if (outcome.kind === "rate_limit") {
    return NextResponse.json({ ok: false, reason: outcome.reason }, { status: 429 })
  }

  if (outcome.kind === "error") {
    console.error("Supabase resetPasswordForEmail failed:", error)
    return NextResponse.json({ ok: false, reason: outcome.reason }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
