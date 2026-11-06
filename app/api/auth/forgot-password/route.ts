import { NextResponse, type NextRequest } from "next/server"
import { supabaseAuthConfigured } from "@/lib/supabase/env"
import { authClientFromRequest, attachAuthCookies } from "@/lib/supabase/pending-cookies"
import { interpretForgotPassword } from "@/lib/auth/forgot-password-auth"
import { createPasswordResetToken } from "@/lib/auth/password-reset-store"
import { readSendKeys } from "@/lib/messaging/keys"

export const runtime = "nodejs"

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as { email?: string } | null
  const email = typeof body?.email === "string" ? body.email.trim() : ""
  if (!email.includes("@")) {
    return NextResponse.json({ ok: false, reason: "Enter your email address." }, { status: 400 })
  }

  // 1. Generate database-backed token
  const token = createPasswordResetToken(email)
  const host = request.headers.get("host") || "www.scopepipe.com"
  const proto = host.includes("localhost") || host.includes("127.0.0.1") ? "http" : "https"
  const canonicalHost = host.includes("localhost") || host.includes("127.0.0.1") ? host : "www.scopepipe.com"
  const resetUrl = `${proto}://${canonicalHost}/reset-password?token=${token}`

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
            <p><a href="${resetUrl}" style="display:inline-block;padding:12px 24px;background-color:#0284c7;color:#fff;text-decoration:none;border-radius:6px;font-weight:600;">Reset Password</a></p>
            <p>Or paste this link into your browser:<br/><a href="${resetUrl}">${resetUrl}</a></p>
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

  // 3. Trigger Supabase resetPasswordForEmail with redirectTo pointing to custom resetUrl
  if (supabaseAuthConfigured()) {
    const pending = authClientFromRequest(request)
    const { error } = await pending.supabase.auth.resetPasswordForEmail(email, { redirectTo: resetUrl })
    const outcome = interpretForgotPassword({
      configured: true,
      error: error ? { message: error.message, status: error.status, code: error.code } : null,
    })

    if (!sentViaResend && outcome.kind === "rate_limit") {
      return attachAuthCookies(
        NextResponse.json({ ok: false, reason: outcome.reason }, { status: 429 }),
        pending.pending,
        pending.cacheHeaders,
      )
    }

    if (!sentViaResend && outcome.kind === "error") {
      console.error("Supabase resetPasswordForEmail failed:", error)
      return attachAuthCookies(
        NextResponse.json({ ok: false, reason: outcome.reason }, { status: 500 }),
        pending.pending,
        pending.cacheHeaders,
      )
    }

    return attachAuthCookies(NextResponse.json({ ok: true }), pending.pending, pending.cacheHeaders)
  }

  return NextResponse.json({ ok: true })
}
