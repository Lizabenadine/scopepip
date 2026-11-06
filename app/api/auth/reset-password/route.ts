import { NextResponse, type NextRequest } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { supabaseAuthConfigured, supabaseBrowserUrl, supabasePublishableKey } from "@/lib/supabase/env"
import { authClientFromRequest, attachAuthCookies } from "@/lib/supabase/pending-cookies"
import { updateUserPassword } from "@/lib/auth/directory"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { verifyPasswordResetToken } from "@/lib/auth/password-reset-store"

export const runtime = "nodejs"

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as {
    password?: string
    token?: string
    tokenHash?: string
    code?: string
    accessToken?: string
    refreshToken?: string
  } | null

  const password = typeof body?.password === "string" ? body.password : ""
  if (password.length < 8) {
    return NextResponse.json({ ok: false, reason: "Use at least 8 characters." }, { status: 400 })
  }

  const rawToken = typeof body?.token === "string" ? body.token.trim() : ""
  const rawTokenHash = typeof body?.tokenHash === "string" ? body.tokenHash.trim() : ""
  const rawCode = typeof body?.code === "string" ? body.code.trim() : ""
  let resolvedAccessToken = typeof body?.accessToken === "string" ? body.accessToken.trim() : ""
  const resolvedRefreshToken = typeof body?.refreshToken === "string" ? body.refreshToken.trim() : ""

  let email: string | undefined
  let userId: string | undefined
  let supabaseUpdated = false

  // 1. Check custom signed token store
  if (rawToken) {
    const customResult = verifyPasswordResetToken(rawToken)
    if (customResult.valid && customResult.email) {
      email = customResult.email
      if (customResult.accessToken && !resolvedAccessToken) {
        resolvedAccessToken = customResult.accessToken
      }
    }
  }

  // 2. Check Supabase token_hash (or non-HMAC token) via verifyOtp on an implicit client
  const otpCandidate = rawTokenHash || (rawToken && !rawToken.includes(".") ? rawToken : "")
  if (otpCandidate && supabaseAuthConfigured()) {
    const implicitClient = createClient(supabaseBrowserUrl(), supabasePublishableKey(), {
      auth: {
        flowType: "implicit",
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    })
    const otpRes = await implicitClient.auth
      .verifyOtp({
        token_hash: otpCandidate,
        type: "recovery",
      })
      .catch(() => null)

    if (otpRes?.data?.user?.email) {
      email = otpRes.data.user.email
      userId = otpRes.data.user.id
    }
    if (otpRes?.data?.session?.access_token) {
      resolvedAccessToken = otpRes.data.session.access_token
    }
  }

  // 3. Check PKCE code exchange if provided
  const pending = authClientFromRequest(request)
  if (rawCode && !resolvedAccessToken && supabaseAuthConfigured()) {
    const exchanged = await pending.supabase.auth.exchangeCodeForSession(rawCode).catch(() => null)
    if (exchanged?.data?.user?.email) {
      email = exchanged.data.user.email
      userId = exchanged.data.user.id
    }
    if (exchanged?.data?.session?.access_token) {
      resolvedAccessToken = exchanged.data.session.access_token
    }
  }

  // 4. If we have a recovery accessToken (from URL hash, verifyOtp, or signed token),
  // update the password directly via Supabase GoTrue REST API (PUT /auth/v1/user).
  // This does NOT require cookies, PKCE, or SUPABASE_SECRET_KEY.
  if (resolvedAccessToken && supabaseAuthConfigured()) {
    try {
      const updateRes = await fetch(`${supabaseBrowserUrl()}/auth/v1/user`, {
        method: "PUT",
        headers: {
          apikey: supabasePublishableKey(),
          Authorization: `Bearer ${resolvedAccessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ password }),
      })

      if (updateRes.ok) {
        supabaseUpdated = true
        const userData = (await updateRes.json().catch(() => null)) as { id?: string; email?: string } | null
        if (userData?.email) email = userData.email
        if (userData?.id) userId = userData.id
      } else if (resolvedRefreshToken) {
        // Fallback: refresh session with refreshToken if accessToken expired
        const implicitClient = createClient(supabaseBrowserUrl(), supabasePublishableKey(), {
          auth: {
            flowType: "implicit",
            persistSession: false,
            autoRefreshToken: false,
            detectSessionInUrl: false,
          },
        })
        const sessionRes = await implicitClient.auth
          .setSession({
            access_token: resolvedAccessToken,
            refresh_token: resolvedRefreshToken,
          })
          .catch(() => null)
        if (sessionRes?.data?.session) {
          const updated = await implicitClient.auth.updateUser({ password }).catch(() => null)
          if (updated?.data?.user) {
            supabaseUpdated = true
            if (updated.data.user.email) email = updated.data.user.email
            if (updated.data.user.id) userId = updated.data.user.id
          }
        }
      }
    } catch {
      // fall through to cookie/admin fallbacks
    }
  }

  // 5. Fallback: check server cookie session if still not updated
  if (!supabaseUpdated && supabaseAuthConfigured()) {
    const { data: sessionData } = await pending.supabase.auth.getUser().catch(() => ({ data: { user: null } }))
    if (sessionData?.user?.email) {
      email = sessionData.user.email
      userId = sessionData.user.id
      const { error: updateAuthError } = await pending.supabase.auth.updateUser({ password })
      if (!updateAuthError) {
        supabaseUpdated = true
      }
    }
  }

  if (!email) {
    return attachAuthCookies(
      NextResponse.json(
        { ok: false, reason: "This password reset link is invalid or has expired. Please request a new one." },
        { status: 400 },
      ),
      pending.pending,
      pending.cacheHeaders,
    )
  }

  // 6. If supabaseAdmin is configured and password wasn't updated via token yet, update via admin API
  const admin = supabaseAdmin()
  if (admin && !supabaseUpdated) {
    if (!userId) {
      try {
        const { data: userList } = await admin.auth.admin.listUsers()
        const found = userList?.users?.find((u) => u.email?.toLowerCase() === email?.toLowerCase())
        if (found?.id) {
          userId = found.id
        }
      } catch {
        // ignore
      }
    }
    if (userId) {
      const { error: adminError } = await admin.auth.admin.updateUserById(userId, { password })
      if (!adminError) {
        supabaseUpdated = true
      } else {
        console.error("supabase.auth.admin.updateUserById failed:", adminError.message)
      }
    }
  }

  // 7. Update local Scopepipe account directory store (ignore read-only filesystem errors on serverless)
  try {
    await updateUserPassword(email, password)
  } catch {
    // On Vercel without SUPABASE_SECRET_KEY, /var/task is read-only; Supabase Auth holds the updated password
  }

  return attachAuthCookies(NextResponse.json({ ok: true, email }), pending.pending, pending.cacheHeaders)
}
