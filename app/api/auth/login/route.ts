import { authSecret, isMasterAdmin, login, sessionByEmail, updateUserPassword } from "@/lib/auth/directory"
import { slugifyCompanyName } from "@/lib/auth/company-slug"
import { hashPassword } from "@/lib/auth/password"
import { isUserRole } from "@/lib/auth/role"
import { jsonWithOfficeSession, jsonWithSession } from "@/lib/auth/request"
import { SESSION_COOKIE, sessionCookie, type OfficeSession } from "@/lib/auth/session"
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

  // When Supabase Auth is configured, always verify against Supabase Auth to guarantee fresh session and auth cookies
  if (supabaseAuthConfigured() && password) {
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

        // Master admin enforcement for founder account
        if (
          isMasterAdmin(sessionUser) ||
          isMasterAdmin({ email: authUser.email || email, authUserId: authUser.id, id: authUser.id })
        ) {
          sessionUser.role = "super_admin"
          sessionUser.subscriptionStatus = "lifetime"
          sessionUser.trialEndsAt = ""
          sessionUser.companyId = "6121f9b9-59df-4190-b4ff-289a062f4c20"
          sessionUser.id = "374258f7-136a-4431-a6af-f81c3a01b48c"
          sessionUser.authUserId = authUser.id
        }
        const sessionToken = signOfficeSession(sessionUser, authSecret())
        const host = request.headers.get("x-forwarded-host") || request.headers.get("host") || ""
        const cookieDomain = host.includes("scopepipe.com") ? ".scopepipe.com" : undefined
        const response = NextResponse.json({
          ok: true,
          user: sessionUser,
          hosted: true,
          passwordHash: hashPassword(password),
        })
        response.cookies.set(SESSION_COOKIE, sessionToken, {
          path: "/",
          httpOnly: true,
          sameSite: "lax",
          maxAge: 30 * 24 * 60 * 60,
          secure: process.env.NODE_ENV === "production" || Boolean(process.env.VERCEL),
          domain: cookieDomain,
        })
        return attachAuthCookies(response, pending.pending, pending.cacheHeaders, cookieDomain)
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
  if (isMasterAdmin(result.user)) {
    result.user.role = "super_admin"
    result.user.subscriptionStatus = "lifetime"
    result.user.trialEndsAt = ""
    result.user.companyId = "6121f9b9-59df-4190-b4ff-289a062f4c20"
  }
  if (result.hosted) return jsonWithOfficeSession(result.user, { ok: true, user: result.user, hosted: true })
  return jsonWithSession(result.user.id, { ok: true, user: result.user })
}
