import { NextResponse, type NextRequest } from "next/server"
import type { EmailOtpType } from "@supabase/supabase-js"
import { authSecret, sessionByEmail } from "@/lib/auth/directory"
import { sessionCookie } from "@/lib/auth/session"
import { signSession } from "@/lib/auth/session-token"
import { supabaseAuthConfigured } from "@/lib/supabase/env"
import { attachAuthCookies, authClientFromRequest } from "@/lib/supabase/pending-cookies"

export const runtime = "nodejs"

const OTP_TYPES = new Set<EmailOtpType>(["signup", "invite", "magiclink", "recovery", "email_change", "email"])

function otpType(value: string | null): EmailOtpType | null {
  if (value && OTP_TYPES.has(value as EmailOtpType)) return value as EmailOtpType
  return null
}

export async function GET(request: NextRequest) {
  const failed = NextResponse.redirect(new URL("/signup?confirm=error", request.url))
  if (!supabaseAuthConfigured()) return failed

  const pending = authClientFromRequest(request)
  const code = request.nextUrl.searchParams.get("code")
  const tokenHash = request.nextUrl.searchParams.get("token_hash")
  const type = otpType(request.nextUrl.searchParams.get("type"))
  let confirmed = false
  if (code) {
    const exchanged = await pending.supabase.auth.exchangeCodeForSession(code)
    confirmed = !exchanged.error
  } else if (tokenHash && type) {
    const verified = await pending.supabase.auth.verifyOtp({ token_hash: tokenHash, type })
    confirmed = !verified.error
  }
  if (!confirmed) return attachAuthCookies(failed, pending.pending, pending.cacheHeaders)

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
