import { NextResponse, type NextRequest } from "next/server"
import type { EmailOtpType } from "@supabase/supabase-js"
import { authSecret, sessionByEmail } from "@/lib/auth/directory"
import { sessionCookie } from "@/lib/auth/session"
import { signSession } from "@/lib/auth/session-token"
import { canonicalResetPasswordUrl } from "@/lib/auth/forgot-password-auth"
import { supabaseAuthConfigured } from "@/lib/supabase/env"
import { attachAuthCookies, authClientFromRequest } from "@/lib/supabase/pending-cookies"

export const runtime = "nodejs"

const OTP_TYPES = new Set<EmailOtpType>(["signup", "invite", "magiclink", "recovery", "email_change", "email"])

function otpType(value: string | null): EmailOtpType | null {
  if (value && OTP_TYPES.has(value as EmailOtpType)) return value as EmailOtpType
  return null
}

export async function GET(request: NextRequest) {
  const next = request.nextUrl.searchParams.get("next")
  const typeParam = request.nextUrl.searchParams.get("type")
  const type = otpType(typeParam)
  const tokenHash = request.nextUrl.searchParams.get("token_hash")
  const isRecovery = type === "recovery" || Boolean(tokenHash) || next === "/reset-password" || next?.startsWith("/reset-password")

  const errorParam = request.nextUrl.searchParams.get("error") || request.nextUrl.searchParams.get("error_description")
  if (errorParam && isRecovery) {
    const errorUrl = canonicalResetPasswordUrl(request.url)
    errorUrl.search = request.nextUrl.search
    return NextResponse.redirect(errorUrl)
  }

  const failed = NextResponse.redirect(
    isRecovery ? canonicalResetPasswordUrl(request.url) : new URL("/signup?confirm=error", request.url),
  )
  if (!supabaseAuthConfigured()) return failed

  const pending = authClientFromRequest(request)
  const code = request.nextUrl.searchParams.get("code")
  const resolvedType = type || (isRecovery ? ("recovery" as EmailOtpType) : null)
  let confirmed = false
  let errorMessage: string | null = null

  if (code) {
    const exchanged = await pending.supabase.auth.exchangeCodeForSession(code)
    confirmed = !exchanged.error
    if (exchanged.error) errorMessage = exchanged.error.message
  } else if (tokenHash && resolvedType) {
    const verified = await pending.supabase.auth.verifyOtp({ token_hash: tokenHash, type: resolvedType })
    confirmed = !verified.error
    if (verified.error) errorMessage = verified.error.message
  }

  if (!confirmed) {
    const failureTarget = canonicalResetPasswordUrl(request.url)
    failureTarget.searchParams.set("error", "recovery_failed")
    failureTarget.searchParams.set(
      "error_description",
      errorMessage || "This password reset link is invalid or has expired.",
    )
    return attachAuthCookies(
      NextResponse.redirect(isRecovery ? failureTarget : new URL("/signup?confirm=error", request.url)),
      pending.pending,
      pending.cacheHeaders,
    )
  }

  // For password recovery, redirect to the reset form — the user has not logged in yet.
  if (isRecovery) {
    const reset = NextResponse.redirect(canonicalResetPasswordUrl(request.url))
    return attachAuthCookies(reset, pending.pending, pending.cacheHeaders)
  }

  const { data } = await pending.supabase.auth.getUser()
  const office = data.user?.email ? await sessionByEmail(data.user.email) : null
  if (!office) {
    const login = NextResponse.redirect(new URL("/login?confirmed=1", request.url))
    return attachAuthCookies(login, pending.pending, pending.cacheHeaders)
  }

  const response = NextResponse.redirect(new URL("/dashboard", request.url))
  response.headers.append("set-cookie", sessionCookie(signSession(office.id, authSecret())))
  return attachAuthCookies(response, pending.pending, pending.cacheHeaders)
}
