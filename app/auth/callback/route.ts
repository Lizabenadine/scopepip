import { NextResponse, type NextRequest } from "next/server"
import type { EmailOtpType } from "@supabase/supabase-js"
import { authSecret, sessionByEmail } from "@/lib/auth/directory"
import { sessionCookie } from "@/lib/auth/session"
import { signOfficeSession, signSession } from "@/lib/auth/session-token"
import { canonicalResetPasswordUrl } from "@/lib/auth/forgot-password-auth"
import { supabaseAuthConfigured } from "@/lib/supabase/env"
import { attachAuthCookies, authClientFromRequest } from "@/lib/supabase/pending-cookies"
import { supabaseServerKey } from "@/lib/supabase/admin"

export const runtime = "nodejs"

const OTP_TYPES = new Set<EmailOtpType>(["signup", "invite", "magiclink", "recovery", "email_change", "email"])

function otpType(value: string | null): EmailOtpType | null {
  if (value && OTP_TYPES.has(value as EmailOtpType)) return value as EmailOtpType
  return null
}

function canonicalTargetUrl(pathAndQuery: string, requestUrl: string): URL {
  const url = new URL(pathAndQuery, requestUrl)
  if (url.hostname === "scopepipe.com") {
    url.hostname = "www.scopepipe.com"
  }
  return url
}

export async function GET(request: NextRequest) {
  const next = request.nextUrl.searchParams.get("next")
  const typeParam = request.nextUrl.searchParams.get("type")
  const type = otpType(typeParam)
  const tokenHash = request.nextUrl.searchParams.get("token_hash")
  const isRecovery = type === "recovery" || next === "/reset-password" || next?.startsWith("/reset-password")

  const errorParam = request.nextUrl.searchParams.get("error") || request.nextUrl.searchParams.get("error_description")
  if (errorParam && isRecovery) {
    const errorUrl = canonicalResetPasswordUrl(request.url)
    errorUrl.search = request.nextUrl.search
    return NextResponse.redirect(errorUrl)
  }

  // For password recovery with token_hash, forward token_hash to /reset-password so verification
  // and password update occur together when the user submits the form.
  if (isRecovery && tokenHash) {
    const resetTarget = canonicalResetPasswordUrl(request.url)
    resetTarget.searchParams.set("token_hash", tokenHash)
    resetTarget.searchParams.set("type", "recovery")
    return NextResponse.redirect(resetTarget)
  }

  const failed = NextResponse.redirect(
    isRecovery ? canonicalResetPasswordUrl(request.url) : canonicalTargetUrl("/signup?confirm=error", request.url),
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
  } else {
    const { data: existingSession } = await pending.supabase.auth.getUser()
    if (existingSession?.user) {
      confirmed = true
    }
  }

  if (!confirmed) {
    const failureTarget = isRecovery
      ? canonicalResetPasswordUrl(request.url)
      : canonicalTargetUrl("/signup?confirm=error", request.url)
    if (isRecovery) {
      failureTarget.searchParams.set("error", "recovery_failed")
      failureTarget.searchParams.set(
        "error_description",
        errorMessage || "This password reset link is invalid or has expired.",
      )
    }
    return attachAuthCookies(
      NextResponse.redirect(failureTarget),
      pending.pending,
      pending.cacheHeaders,
    )
  }

  if (isRecovery) {
    const reset = NextResponse.redirect(canonicalResetPasswordUrl(request.url))
    return attachAuthCookies(reset, pending.pending, pending.cacheHeaders)
  }

  const { data } = await pending.supabase.auth.getUser()
  const office = data.user?.email ? await sessionByEmail(data.user.email) : null
  if (!office) {
    const login = canonicalTargetUrl("/login?confirmed=1&onboarding=incomplete", request.url)
    return attachAuthCookies(NextResponse.redirect(login), pending.pending, pending.cacheHeaders)
  }

  const response = NextResponse.redirect(canonicalTargetUrl("/dashboard", request.url))
  const token = !supabaseServerKey() ? signOfficeSession(office, authSecret()) : signSession(office.id, authSecret())
  response.headers.append("set-cookie", sessionCookie(token))
  return attachAuthCookies(response, pending.pending, pending.cacheHeaders)
}
