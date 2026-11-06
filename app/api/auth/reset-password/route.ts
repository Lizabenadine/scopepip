import { NextResponse, type NextRequest } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { supabaseAuthConfigured, supabaseBrowserUrl, supabasePublishableKey } from "@/lib/supabase/env"
import { updateUserPassword } from "@/lib/auth/directory"

export const runtime = "nodejs"

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as {
    token_hash?: string
    password?: string
  } | null

  const tokenHash = typeof body?.token_hash === "string" ? body.token_hash.trim() : ""
  const password = typeof body?.password === "string" ? body.password : ""

  if (password.length < 8) {
    return NextResponse.json({ ok: false, reason: "Use at least 8 characters." }, { status: 400 })
  }

  if (!tokenHash) {
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

  const supabase = createClient(supabaseBrowserUrl(), supabasePublishableKey(), {
    auth: {
      flowType: "implicit",
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  })

  // 1. Verify the one-time recovery token_hash once with Supabase Auth
  const { data: verifyData, error: verifyError } = await supabase.auth.verifyOtp({
    token_hash: tokenHash,
    type: "recovery",
  })

  if (verifyError || !verifyData.session || !verifyData.user?.email) {
    return NextResponse.json(
      {
        ok: false,
        reason: verifyError?.message || "This password reset link is invalid or has expired. Please request a new one.",
      },
      { status: 400 },
    )
  }

  const email = verifyData.user.email

  // 2. Update the user's password in Supabase Auth using the verified recovery session
  const { data: updateData, error: updateError } = await supabase.auth.updateUser({
    password,
  })

  if (updateError || !updateData.user) {
    return NextResponse.json(
      {
        ok: false,
        reason: updateError?.message || "The password could not be updated. Please try again.",
      },
      { status: 400 },
    )
  }

  // 3. Synchronize local account store when storage is writable
  try {
    await updateUserPassword(email, password)
  } catch {
    // On Vercel without SUPABASE_SECRET_KEY, /var/task is read-only; Supabase Auth holds the updated password
  }

  return NextResponse.json({ ok: true })
}
