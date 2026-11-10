import { authSecret, login, sessionByEmail, updateUserPassword } from "@/lib/auth/directory"
import { slugifyCompanyName } from "@/lib/auth/company-slug"
import { hashPassword } from "@/lib/auth/password"
import { isUserRole } from "@/lib/auth/role"
import { jsonWithOfficeSession, jsonWithSession } from "@/lib/auth/request"
import { sessionCookie, type OfficeSession } from "@/lib/auth/session"
import { signOfficeSession } from "@/lib/auth/session-token"
import { trialEndsAt } from "@/lib/billing/access"
import { supabaseAuthConfigured } from "@/lib/supabase/env"
import { attachAuthCookies, authClientFromRequest } from "@/lib/supabase/pending-cookies"
import { NextResponse, type NextRequest } from "next/server"

export const runtime = "nodejs"

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as {
    email?: string
    password?: string
    passwordHash?: string
    hostedUser?: OfficeSession
    role?: string
  } | null
  const email = body?.email ?? ""
  const password = body?.password ?? ""
  let result = await login({
    email,
    password,
    passwordHash: body?.passwordHash,
    hostedUser: body?.hostedUser,
    role: body?.role && isUserRole(body.role) ? body.role : undefined,
  })

  // If local password verification fails but Supabase Auth is configured, verify against Supabase Auth
  if (!result.ok && supabaseAuthConfigured() && password) {
    const pending = authClientFromRequest(request)
    try {
      let signInRes = await pending.supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      })

      // If failed and email has uppercase characters, retry with exact email
      if (signInRes.error && email.trim() !== email.trim().toLowerCase()) {
        signInRes = await pending.supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        })
      }

      if (signInRes.data?.user && !signInRes.error) {
        const authUser = signInRes.data.user
        try {
          await updateUserPassword(email, password)
        } catch {
          // On Vercel without SUPABASE_SECRET_KEY, /var/task is read-only
        }
        result = await login({
          email,
          password,
          role: body?.role && isUserRole(body.role) ? body.role : undefined,
        })
        const existingSession = await sessionByEmail(email)
        const meta = (authUser.user_metadata || {}) as { full_name?: string; name?: string; company_name?: string }
        const fallbackCompanyName =
          body?.hostedUser?.companyName || existingSession?.companyName || meta.company_name || "ScopePipe"
        const sessionUser: OfficeSession =
          (result.ok ? result.user : null) ||
          body?.hostedUser ||
          existingSession || {
            id: authUser.id,
            name: meta.name || meta.full_name || email.trim().split("@")[0] || "Owner",
            email: email.trim().toLowerCase(),
            role: body?.role && isUserRole(body.role) ? body.role : "owner",
            companyId: authUser.id,
            companyName: fallbackCompanyName,
            companySlug: slugifyCompanyName(fallbackCompanyName),
            subscriptionStatus: "trialing",
            trialEndsAt: trialEndsAt(new Date()),
            authUserId: authUser.id,
          }
        const sessionToken = signOfficeSession(sessionUser, authSecret())
        const response = NextResponse.json({
          ok: true,
          user: sessionUser,
          hosted: true,
          passwordHash: hashPassword(password),
        })
        response.headers.append("set-cookie", sessionCookie(sessionToken))
        return attachAuthCookies(response, pending.pending, pending.cacheHeaders)
      }

      if (signInRes.error) {
        console.error("Supabase signInWithPassword failed:", {
          email: email.trim(),
          errorMsg: signInRes.error.message,
          status: signInRes.error.status,
        })
        const msg = signInRes.error.message || ""
        if (msg.toLowerCase().includes("email not confirmed")) {
          return NextResponse.json(
            { ok: false, reason: "Please verify your email address before signing in. Check your inbox for the confirmation link." },
            { status: 401 },
          )
        }
        if (msg.toLowerCase().includes("invalid login credentials")) {
          return NextResponse.json(
            { ok: false, reason: "That email and password do not match. If you recently reset your password, please make sure you type the new password and not an old saved password." },
            { status: 401 },
          )
        }
        return NextResponse.json({ ok: false, reason: msg || "That email and password do not match." }, { status: 401 })
      }
    } catch (err) {
      console.error("Supabase signInWithPassword exception:", err)
    }
  }

  if (!result.ok) return NextResponse.json(result, { status: 401 })
  if (result.hosted) return jsonWithOfficeSession(result.user, { ok: true, user: result.user, hosted: true })
  return jsonWithSession(result.user.id, { ok: true, user: result.user })
}
