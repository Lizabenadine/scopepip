import { login, updateUserPassword } from "@/lib/auth/directory"
import { isUserRole } from "@/lib/auth/role"
import { jsonWithOfficeSession, jsonWithSession } from "@/lib/auth/request"
import type { OfficeSession } from "@/lib/auth/session"
import { supabaseAuthConfigured } from "@/lib/supabase/env"
import { authClientFromRequest, attachAuthCookies } from "@/lib/supabase/pending-cookies"
import type { NextRequest } from "next/server"

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
        await updateUserPassword(email, password)
        result = await login({
          email,
          password,
          role: body?.role && isUserRole(body.role) ? body.role : undefined,
        })
      }
    } catch {
      // Continue with original result
    }
  }

  if (!result.ok) return Response.json(result, { status: 401 })
  if (result.hosted) return jsonWithOfficeSession(result.user, { ok: true, user: result.user, hosted: true })
  return jsonWithSession(result.user.id, { ok: true, user: result.user })
}
