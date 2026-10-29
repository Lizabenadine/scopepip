import { login } from "@/lib/auth/directory"
import { isUserRole } from "@/lib/auth/role"
import { jsonWithOfficeSession, jsonWithSession } from "@/lib/auth/request"
import type { OfficeSession } from "@/lib/auth/session"

export const runtime = "nodejs"

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    email?: string
    password?: string
    passwordHash?: string
    hostedUser?: OfficeSession
    role?: string
  } | null
  const result = await login({
    email: body?.email ?? "",
    password: body?.password ?? "",
    passwordHash: body?.passwordHash,
    hostedUser: body?.hostedUser,
    role: body?.role && isUserRole(body.role) ? body.role : undefined,
  })
  if (!result.ok) return Response.json(result, { status: 401 })
  if (result.hosted) return jsonWithOfficeSession(result.user, { ok: true, user: result.user, hosted: true })
  return jsonWithSession(result.user.id, { ok: true, user: result.user })
}
