import { NextResponse, type NextRequest } from "next/server"
import { authSecret, signup, signupInputError } from "@/lib/auth/directory"
import { interpretSignUp } from "@/lib/auth/signup-auth"
import { sessionCookie } from "@/lib/auth/session"
import { signOfficeSession, signSession } from "@/lib/auth/session-token"
import { attachAuthCookies, authClientFromRequest } from "@/lib/supabase/pending-cookies"
import { supabaseAuthConfigured } from "@/lib/supabase/env"

export const runtime = "nodejs"

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as {
    name?: string
    email?: string
    password?: string
    companyName?: string
  } | null
  const input = {
    name: body?.name ?? "",
    email: body?.email ?? "",
    password: body?.password ?? "",
    companyName: body?.companyName ?? "",
  }
  const invalid = signupInputError(input)
  if (invalid) return NextResponse.json({ ok: false, reason: invalid }, { status: 400 })

  let pendingCookies: ReturnType<typeof authClientFromRequest>["pending"] = []
  let cacheHeaders: Record<string, string> = {}
  let outcome = interpretSignUp({
    configured: false,
    errorMessage: null,
    hasSession: false,
    hasUser: false,
    identityCount: null,
  })
  if (supabaseAuthConfigured()) {
    const pending = authClientFromRequest(request)
    try {
      const { data, error } = await pending.supabase.auth.signUp({
        email: input.email.trim(),
        password: input.password,
        options: {
          emailRedirectTo: `${request.nextUrl.origin}/auth/callback`,
          data: { name: input.name.trim(), company_name: input.companyName.trim() },
        },
      })
      outcome = interpretSignUp({
        configured: true,
        errorMessage: error?.message ?? null,
        hasSession: Boolean(data.session),
        hasUser: Boolean(data.user),
        identityCount: data.user?.identities ? data.user.identities.length : null,
      })
      pendingCookies = pending.pending
      cacheHeaders = pending.cacheHeaders
    } catch {
      return NextResponse.json({ ok: false, reason: "That account could not be created." }, { status: 500 })
    }
  }

  if (outcome.kind === "exists") {
    return attachAuthCookies(NextResponse.json({ ok: false, reason: "That email already has an account." }, { status: 400 }), pendingCookies, cacheHeaders)
  }
  if (outcome.kind === "error") {
    return attachAuthCookies(NextResponse.json({ ok: false, reason: outcome.reason }, { status: 400 }), pendingCookies, cacheHeaders)
  }

  try {
    const result = await signup(input)
    if (!result.ok) return NextResponse.json(result, { status: 400 })
    if (outcome.kind === "confirm") {
      return attachAuthCookies(NextResponse.json({ ok: true, confirmEmail: true }), pendingCookies, cacheHeaders)
    }
    const response = NextResponse.json({
      ok: true,
      user: result.user,
      session: true,
      ...(result.hosted
        ? { hosted: true, passwordHash: result.passwordHash, revision: result.revision, book: result.book }
        : {}),
    })
    const token = result.hosted ? signOfficeSession(result.user, authSecret()) : signSession(result.user.id, authSecret())
    response.headers.append("set-cookie", sessionCookie(token))
    return attachAuthCookies(response, pendingCookies, cacheHeaders)
  } catch (error) {
    const reason = error instanceof Error ? error.message : "The account could not be saved."
    return NextResponse.json({ ok: false, reason }, { status: 500 })
  }
}
