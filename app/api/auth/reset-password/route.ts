import { NextResponse, type NextRequest } from "next/server"
import { supabaseAuthConfigured } from "@/lib/supabase/env"
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
    accessToken?: string
    refreshToken?: string
  } | null

  const password = typeof body?.password === "string" ? body.password : ""
  if (password.length < 8) {
    return NextResponse.json({ ok: false, reason: "Use at least 8 characters." }, { status: 400 })
  }

  const rawToken = typeof body?.token === "string" ? body.token.trim() : ""
  const rawTokenHash = typeof body?.tokenHash === "string" ? body.tokenHash.trim() : ""
  const activeToken = rawToken || rawTokenHash

  let email: string | undefined
  let userId: string | undefined

  // 1. Check custom database-backed token store
  if (activeToken) {
    const customResult = verifyPasswordResetToken(activeToken)
    if (customResult.valid && customResult.email) {
      email = customResult.email
    }
  }

  // 2. If not verified via custom token store, check Supabase token_hash / verifyOtp
  const pending = authClientFromRequest(request)
  if (!email && activeToken && supabaseAuthConfigured()) {
    const otpRes = await pending.supabase.auth.verifyOtp({
      token_hash: activeToken,
      type: "recovery",
    }).catch(() => null)

    if (otpRes?.data?.user?.email) {
      email = otpRes.data.user.email
      userId = otpRes.data.user.id
    }
  }

  // 3. Fallback: check session or accessToken if provided
  if (!email && body?.accessToken && supabaseAuthConfigured()) {
    const directUser = await pending.supabase.auth.getUser(body.accessToken).catch(() => null)
    if (directUser?.data?.user?.email) {
      email = directUser.data.user.email
      userId = directUser.data.user.id
    }
  }

  if (!email && supabaseAuthConfigured()) {
    const { data: sessionData } = await pending.supabase.auth.getUser().catch(() => ({ data: { user: null } }))
    if (sessionData?.user?.email) {
      email = sessionData.user.email
      userId = sessionData.user.id
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

  // 4. Resolve Supabase userId by email if not already found
  const admin = supabaseAdmin()
  if (admin && !userId) {
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

  // 5. Update password directly via supabase.auth.admin.updateUserById
  let adminUpdated = false
  if (admin && userId) {
    const { error: adminError } = await admin.auth.admin.updateUserById(userId, { password })
    if (!adminError) {
      adminUpdated = true
    } else {
      console.error("supabase.auth.admin.updateUserById failed:", adminError.message)
    }
  }

  // Fallback to client updateUser if admin was not configured or failed
  if (!adminUpdated && supabaseAuthConfigured()) {
    const { error: updateAuthError } = await pending.supabase.auth.updateUser({ password })
    if (updateAuthError && !admin) {
      return attachAuthCookies(
        NextResponse.json({ ok: false, reason: updateAuthError.message }, { status: 400 }),
        pending.pending,
        pending.cacheHeaders,
      )
    }
  }

  // 6. Update local Scopepipe account directory store
  await updateUserPassword(email, password)

  return attachAuthCookies(NextResponse.json({ ok: true, email }), pending.pending, pending.cacheHeaders)
}
