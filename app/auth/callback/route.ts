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
  const tokenHash =
    request.nextUrl.searchParams.get("token_hash") || request.nextUrl.searchParams.get("token")
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
    isRecovery ? canonicalResetPasswordUrl(request.url) : canonicalTargetUrl("/login?confirmed=1", request.url),
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
    } else {
      // When Supabase confirms an email via implicit flow, tokens arrive in the URL hash (#access_token=...).
      // Since hash fragments are never sent in HTTP request headers to the server, serve an HTML bridge
      // to capture fragment tokens on the client and exchange them with the server securely.
      const bridgeHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Opening Office...</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
</head>
<body style="background:#02182F;color:#fff;font-family:system-ui,-apple-system,sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;">
  <div style="text-align:center;padding:20px;">
    <p style="font-size:18px;font-weight:600;margin:0 0 8px;">Opening your office...</p>
    <p style="font-size:14px;color:#94a3b8;margin:0;">Redirecting to your dashboard...</p>
  </div>
  <script>
    (function() {
      var hash = window.location.hash || "";
      if (hash.indexOf("#") === 0) hash = hash.slice(1);
      var params = new URLSearchParams(hash);
      var accessToken = params.get("access_token");
      var refreshToken = params.get("refresh_token");
      var type = params.get("type");
      if (window.history && window.history.replaceState) {
        window.history.replaceState(null, "", window.location.pathname + window.location.search);
      }
      if (accessToken && refreshToken) {
        if (type === "recovery") {
          window.location.replace("/reset-password");
          return;
        }
        fetch("/auth/callback", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ access_token: accessToken, refresh_token: refreshToken })
        }).then(function(res) {
          return res.json();
        }).then(function(data) {
          if (data && data.redirect) {
            window.location.replace(data.redirect);
          } else {
            window.location.replace("/dashboard");
          }
        }).catch(function() {
          window.location.replace("/login?confirmed=1");
        });
      } else {
        window.location.replace("/login?confirmed=1");
      }
    })();
  </script>
</body>
</html>`
      return new NextResponse(bridgeHtml, {
        status: 200,
        headers: { "Content-Type": "text/html; charset=utf-8" },
      })
    }
  }

  if (!confirmed) {
    const failureTarget = isRecovery
      ? canonicalResetPasswordUrl(request.url)
      : canonicalTargetUrl("/login?confirmed=1", request.url)
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

export async function POST(request: NextRequest) {
  if (!supabaseAuthConfigured()) {
    return NextResponse.json({ ok: false, redirect: "/login?confirmed=1" }, { status: 400 })
  }

  const body = (await request.json().catch(() => null)) as {
    access_token?: string
    refresh_token?: string
  } | null
  const accessToken = body?.access_token?.trim()
  const refreshToken = body?.refresh_token?.trim()

  if (!accessToken || !refreshToken) {
    return NextResponse.json({ ok: false, redirect: "/login?confirmed=1" }, { status: 400 })
  }

  const pending = authClientFromRequest(request)
  const { data, error } = await pending.supabase.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken,
  })

  if (error || !data.user) {
    return attachAuthCookies(
      NextResponse.json({ ok: false, redirect: "/login?confirmed=1" }, { status: 400 }),
      pending.pending,
      pending.cacheHeaders,
    )
  }

  const office = data.user.email ? await sessionByEmail(data.user.email) : null
  if (!office) {
    return attachAuthCookies(
      NextResponse.json({ ok: false, redirect: "/login?confirmed=1&onboarding=incomplete" }),
      pending.pending,
      pending.cacheHeaders,
    )
  }

  const response = NextResponse.json({ ok: true, redirect: "/dashboard" })
  const token = !supabaseServerKey() ? signOfficeSession(office, authSecret()) : signSession(office.id, authSecret())
  response.headers.append("set-cookie", sessionCookie(token))
  return attachAuthCookies(response, pending.pending, pending.cacheHeaders)
}
