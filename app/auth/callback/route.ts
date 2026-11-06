import { NextResponse, type NextRequest } from "next/server"
import type { EmailOtpType } from "@supabase/supabase-js"
import { authSecret, sessionByEmail } from "@/lib/auth/directory"
import { sessionCookie } from "@/lib/auth/session"
import { signSession } from "@/lib/auth/session-token"
import { canonicalResetPasswordUrl } from "@/lib/auth/forgot-password-auth"
import { createPasswordResetToken } from "@/lib/auth/password-reset-store"
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
  const tokenHash = request.nextUrl.searchParams.get("token_hash") || request.nextUrl.searchParams.get("token")
  const isRecovery = type === "recovery" || Boolean(tokenHash && type !== "signup") || next === "/reset-password" || next?.startsWith("/reset-password")

  const errorParam = request.nextUrl.searchParams.get("error") || request.nextUrl.searchParams.get("error_description")
  if (errorParam && isRecovery) {
    const errorUrl = canonicalResetPasswordUrl(request.url)
    errorUrl.search = request.nextUrl.search
    return NextResponse.redirect(errorUrl)
  }

  // For password recovery with token_hash, forward token_hash directly to /reset-password
  // WITHOUT consuming the one-time token on GET (protects against email link scanners and cross-domain cookie loss).
  if (isRecovery && tokenHash) {
    const resetTarget = canonicalResetPasswordUrl(request.url)
    resetTarget.searchParams.set("token_hash", tokenHash)
    resetTarget.searchParams.set("token", tokenHash)
    resetTarget.searchParams.set("type", "recovery")
    return NextResponse.redirect(resetTarget)
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
  let verifiedEmail: string | undefined
  let verifiedAccessToken: string | undefined

  if (code) {
    const exchanged = await pending.supabase.auth.exchangeCodeForSession(code)
    confirmed = !exchanged.error
    if (exchanged.error) errorMessage = exchanged.error.message
    verifiedEmail = exchanged.data?.user?.email
    verifiedAccessToken = exchanged.data?.session?.access_token
  } else if (tokenHash && resolvedType) {
    const verified = await pending.supabase.auth.verifyOtp({ token_hash: tokenHash, type: resolvedType })
    confirmed = !verified.error
    if (verified.error) errorMessage = verified.error.message
    verifiedEmail = verified.data?.user?.email
    verifiedAccessToken = verified.data?.session?.access_token
  }

  if (!confirmed) {
    const failureTarget = canonicalResetPasswordUrl(request.url)
    if (code) failureTarget.searchParams.set("code", code)
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

  // For password recovery, redirect to the reset form with a signed token containing email + accessToken
  if (isRecovery) {
    const resetTarget = canonicalResetPasswordUrl(request.url)
    if (verifiedEmail) {
      resetTarget.searchParams.set("token", createPasswordResetToken(verifiedEmail, verifiedAccessToken))
    }
    const reset = NextResponse.redirect(resetTarget)
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
