import { NextResponse, type NextRequest } from "next/server"
import { supabaseAuthConfigured } from "@/lib/supabase/env"
import { authClientFromRequest, attachAuthCookies } from "@/lib/supabase/pending-cookies"
import { updateUserPassword } from "@/lib/auth/directory"
import { supabaseAdmin } from "@/lib/supabase/admin"

export const runtime = "nodejs"

export async function POST(request: NextRequest) {
  if (!supabaseAuthConfigured()) {
    return NextResponse.json({ ok: false, reason: "Supabase Auth is not configured." }, { status: 503 })
  }

  const body = (await request.json().catch(() => null)) as {
    password?: string
    tokenHash?: string
    accessToken?: string
    refreshToken?: string
  } | null
  const password = typeof body?.password === "string" ? body.password : ""
  if (password.length < 8) {
    return NextResponse.json({ ok: false, reason: "Use at least 8 characters." }, { status: 400 })
  }

  const pending = authClientFromRequest(request)

  // 1. If token_hash was provided, verify it on the server client to establish the recovery session
  if (body?.tokenHash) {
    await pending.supabase.auth.verifyOtp({ token_hash: body.tokenHash, type: "recovery" }).catch(() => {})
  }

  // 2. If access_token was provided, set the session on the server client
  if (body?.accessToken) {
    await pending.supabase.auth.setSession({
      access_token: body.accessToken,
      refresh_token: body.refreshToken || "",
    }).catch(() => {})
  }

  // 3. Get authenticated user from session or direct token
  let { data, error } = await pending.supabase.auth.getUser()

  if ((error || !data?.user?.email) && body?.accessToken) {
    const directUser = await pending.supabase.auth.getUser(body.accessToken).catch(() => null)
    if (directUser?.data?.user) {
      data = directUser.data
      error = null
    }
  }

  if (error || !data?.user?.email) {
    return attachAuthCookies(
      NextResponse.json({ ok: false, reason: "Auth session missing or expired." }, { status: 401 }),
      pending.pending,
      pending.cacheHeaders,
    )
  }

  const user = data.user
  const email = user.email!
  let supabaseUpdated = false

  // 4. Update the user password in Supabase:
  // First attempt via admin API if available (bypasses browser session restrictions)
  const admin = supabaseAdmin()
  if (admin && user.id) {
    const adminRes = await admin.auth.admin.updateUserById(user.id, { password }).catch(() => null)
    if (adminRes && !adminRes.error) {
      supabaseUpdated = true
    }
  }

  if (!supabaseUpdated) {
    const { error: updateAuthError } = await pending.supabase.auth.updateUser({ password })
    if (updateAuthError) {
      return attachAuthCookies(
        NextResponse.json({ ok: false, reason: updateAuthError.message }, { status: 400 }),
        pending.pending,
        pending.cacheHeaders,
      )
    }
  }

  await updateUserPassword(email, password)

  return attachAuthCookies(NextResponse.json({ ok: true }), pending.pending, pending.cacheHeaders)
}
