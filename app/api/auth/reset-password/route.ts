import { NextResponse, type NextRequest } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { supabaseAuthConfigured, supabaseBrowserUrl, supabasePublishableKey } from "@/lib/supabase/env"
import { authClientFromRequest, attachAuthCookies } from "@/lib/supabase/pending-cookies"
import { updateUserPassword } from "@/lib/auth/directory"

export const runtime = "nodejs"

async function updateSupabasePasswordWithToken(
  accessToken: string,
  newPassword: string,
): Promise<{ ok: true; email: string } | { ok: false; reason: string }> {
  const url = supabaseBrowserUrl().replace(/\/$/, "")
  const apikey = supabasePublishableKey()

  // 1. Verify user identity using the recovery session Bearer token
  const userRes = await fetch(`${url}/auth/v1/user`, {
    method: "GET",
    headers: {
      apikey,
      Authorization: `Bearer ${accessToken}`,
    },
  })
  const userData = (await userRes.json().catch(() => null)) as {
    email?: string
    message?: string
    msg?: string
    error_description?: string
    user?: { email?: string; id?: string }
  } | null

  const email = userData?.user?.email || userData?.email
  if (!userRes.ok || !email) {
    const errorMsg =
      userData?.msg ||
      userData?.error_description ||
      userData?.message ||
      "This password reset link is invalid or has expired. Please request a new one."
    console.error("Supabase /auth/v1/user verification failed:", { status: userRes.status, errorMsg, userData })
    return { ok: false, reason: errorMsg }
  }

  // 2. Update user's password in Supabase Auth
  const updateRes = await fetch(`${url}/auth/v1/user`, {
    method: "PUT",
    headers: {
      apikey,
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ password: newPassword }),
  })
  const updateData = (await updateRes.json().catch(() => null)) as {
    id?: string
    message?: string
    msg?: string
    error_description?: string
    user?: { id?: string; email?: string }
  } | null

  const updatedId = updateData?.user?.id || updateData?.id
  if (!updateRes.ok || !updatedId) {
    const errorMsg =
      updateData?.msg ||
      updateData?.error_description ||
      updateData?.message ||
      "The password could not be updated. Please try again."
    console.error("Supabase /auth/v1/user update failed:", { status: updateRes.status, errorMsg, updateData })
    return { ok: false, reason: errorMsg }
  }

  return { ok: true, email }
}

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as {
    token_hash?: string
    access_token?: string
    code?: string
    email?: string
    password?: string
  } | null

  const tokenHash = typeof body?.token_hash === "string" ? body.token_hash.trim() : ""
  const accessToken = typeof body?.access_token === "string" ? body.access_token.trim() : ""
  const code = typeof body?.code === "string" ? body.code.trim() : ""
  const emailParam = typeof body?.email === "string" ? body.email.trim() : ""
  const password = typeof body?.password === "string" ? body.password : ""

  if (password.length < 8) {
    return NextResponse.json({ ok: false, reason: "Use at least 8 characters." }, { status: 400 })
  }

  // If email and password provided directly (synced from client-side verification)
  if (emailParam && password) {
    try {
      await updateUserPassword(emailParam, password)
    } catch {}
    return NextResponse.json({ ok: true })
  }

  if (!tokenHash && !accessToken && !code) {
    // Check if the user already has an active session from cookies (e.g. from /auth/callback)
    if (supabaseAuthConfigured()) {
      const pending = authClientFromRequest(request)
      const { data: sessionUser } = await pending.supabase.auth.getUser()
      if (sessionUser?.user?.email) {
        const { error: updateError } = await pending.supabase.auth.updateUser({ password })
        if (updateError) {
          return NextResponse.json(
            { ok: false, reason: updateError.message || "The password could not be updated." },
            { status: 400 },
          )
        }
        try {
          await updateUserPassword(sessionUser.user.email, password)
        } catch {}
        return attachAuthCookies(NextResponse.json({ ok: true }), pending.pending, pending.cacheHeaders)
      }
    }

    return NextResponse.json(
      { ok: false, reason: "Missing password reset token. Please open the reset link from your email." },
      { status: 400 },
    )
  }

  if (!supabaseAuthConfigured()) {
    return NextResponse.json(
      { ok: false, reason: "Authentication service is not configured." },
      { status: 500 },
    )
  }

  // 1. Direct access_token provided from Supabase recovery fragment
  if (accessToken) {
    const res = await updateSupabasePasswordWithToken(accessToken, password)
    if (!res.ok) {
      return NextResponse.json({ ok: false, reason: res.reason }, { status: 400 })
    }
    try {
      await updateUserPassword(res.email, password)
    } catch {}
    return NextResponse.json({ ok: true })
  }

  // 2. PKCE code provided
  if (code) {
    const pending = authClientFromRequest(request)
    const { data: exchangeData, error: exchangeError } = await pending.supabase.auth.exchangeCodeForSession(code)
    if (exchangeError || !exchangeData.session?.access_token || !exchangeData.user?.email) {
      return NextResponse.json(
        { ok: false, reason: exchangeError?.message || "This password reset link is invalid or has expired." },
        { status: 400 },
      )
    }

    const res = await updateSupabasePasswordWithToken(exchangeData.session.access_token, password)
    if (!res.ok) {
      return NextResponse.json({ ok: false, reason: res.reason }, { status: 400 })
    }

    try {
      await updateUserPassword(res.email, password)
    } catch {}

    return attachAuthCookies(NextResponse.json({ ok: true }), pending.pending, pending.cacheHeaders)
  }

  // 3. token_hash provided
  const supabase = createClient(supabaseBrowserUrl(), supabasePublishableKey(), {
    auth: {
      flowType: "implicit",
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  })

  const { data: verifyData, error: verifyError } = await supabase.auth.verifyOtp({
    token_hash: tokenHash,
    type: "recovery",
  })

  if (verifyError || !verifyData.session?.access_token || !verifyData.user?.email) {
    return NextResponse.json(
      {
        ok: false,
        reason: verifyError?.message || "This password reset link is invalid or has expired. Please request a new one.",
      },
      { status: 400 },
    )
  }

  const res = await updateSupabasePasswordWithToken(verifyData.session.access_token, password)
  if (!res.ok) {
    return NextResponse.json({ ok: false, reason: res.reason }, { status: 400 })
  }

  try {
    await updateUserPassword(res.email, password)
  } catch {}

  return NextResponse.json({ ok: true })
}
