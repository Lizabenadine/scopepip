import { NextResponse, type NextRequest } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { supabaseAuthConfigured, supabaseBrowserUrl, supabasePublishableKey } from "@/lib/supabase/env"
import { interpretForgotPassword, recoveryRedirectUrl } from "@/lib/auth/forgot-password-auth"
import { createPasswordResetToken } from "@/lib/auth/password-reset-store"
import { readSendKeys } from "@/lib/messaging/keys"

export const runtime = "nodejs"

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as { email?: string } | null
  const email = typeof body?.email === "string" ? body.email.trim() : ""
  if (!email.includes("@")) {
    return NextResponse.json({ ok: false, reason: "Enter your email address." }, { status: 400 })
  }

  // 1. Generate signed reset token for direct URL reset
  const token = createPasswordResetToken(email)
  const host = request.headers.get("host") || "www.scopepipe.com"
  const proto = host.includes("localhost") || host.includes("127.0.0.1") ? "http" : "https"
  const canonicalHost = host.includes("localhost") || host.includes("127.0.0.1") ? host : "www.scopepipe.com"
  const customResetUrl = `${proto}://${canonicalHost}/reset-password?token=${token}`

  // 2. If Resend is configured, send the custom reset email with query parameters
  const keys = readSendKeys()
  let sentViaResend = false
  if (keys.resendKey && keys.resendFrom.includes("@")) {
    try {
      const emailRes = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          authorization: `Bearer ${keys.resendKey}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          from: keys.resendFrom,
          to: email,
          subject: "Reset your Scopepipe password",
          html: `
            <h2>Reset your password</h2>
            <p>Click the link below to set a new password for your Scopepipe account:</p>
            <p><a href="${customResetUrl}" style="display:inline-block;padding:12px 24px;background-color:#0284c7;color:#fff;text-decoration:none;border-radius:6px;font-weight:600;">Reset Password</a></p>
            <p>Or paste this link into your browser:<br/><a href="${customResetUrl}">${customResetUrl}</a></p>
            <p>This link expires in 1 hour.</p>
          `,
        }),
      })
      if (emailRes.ok) {
        sentViaResend = true
      }
    } catch {
      // ignore
    }
  }

  // 3. Trigger Supabase resetPasswordForEmail using implicit flow (no PKCE code_challenge)
  // and canonical allowlisted redirect URL (https://scopepipe.com/reset-password)
  if (supabaseAuthConfigured()) {
    const supabase = createClient(supabaseBrowserUrl(), supabasePublishableKey(), {
      auth: {
        flowType: "implicit",
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    })
    const redirectTo = recoveryRedirectUrl(host, new URL(request.url).origin)
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo })
    const outcome = interpretForgotPassword({
      configured: true,
      error: error ? { message: error.message, status: error.status, code: error.code } : null,
    })

    if (!sentViaResend && outcome.kind === "rate_limit") {
      return NextResponse.json({ ok: false, reason: outcome.reason }, { status: 429 })
    }

    if (!sentViaResend && outcome.kind === "error") {
      console.error("Supabase resetPasswordForEmail failed:", error)
      return NextResponse.json({ ok: false, reason: outcome.reason }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ ok: true })
}
