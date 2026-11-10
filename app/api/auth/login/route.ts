import { login, sessionByEmail, updateUserPassword } from "@/lib/auth/directory"
import { slugifyCompanyName } from "@/lib/auth/company-slug"
import { hashPassword } from "@/lib/auth/password"
import { isUserRole } from "@/lib/auth/role"
import { jsonWithOfficeSession, jsonWithSession } from "@/lib/auth/request"
import type { OfficeSession } from "@/lib/auth/session"
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
      const { data, error } = await pending.supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      })
      if (!error && data.user) {
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
        if (!result.ok) {
          const existingSession = await sessionByEmail(email)
          const meta = (data.user.user_metadata || {}) as { full_name?: string; name?: string; company_name?: string }
          const fallbackCompanyName =
            body?.hostedUser?.companyName || existingSession?.companyName || meta.company_name || "ScopePipe"
          const fallbackUser: OfficeSession = body?.hostedUser ||
            existingSession || {
              id: data.user.id,
              name: meta.name || meta.full_name || email.trim().split("@")[0] || "Owner",
              email: email.trim().toLowerCase(),
              role: body?.role && isUserRole(body.role) ? body.role : "owner",
              companyId: data.user.id,
              companyName: fallbackCompanyName,
              companySlug: slugifyCompanyName(fallbackCompanyName),
              subscriptionStatus: "trialing",
              trialEndsAt: trialEndsAt(new Date()),
              authUserId: data.user.id,
            }
          const response = jsonWithOfficeSession(fallbackUser, {
            ok: true,
            user: fallbackUser,
            hosted: true,
            passwordHash: hashPassword(password),
          })
          return attachAuthCookies(response as unknown as NextResponse, pending.pending, pending.cacheHeaders)
        }
      }
    } catch {
      // Continue with original result
    }
  }

  if (!result.ok) return Response.json(result, { status: 401 })
  if (result.hosted) return jsonWithOfficeSession(result.user, { ok: true, user: result.user, hosted: true })
  return jsonWithSession(result.user.id, { ok: true, user: result.user })
}
