import { login } from "@/lib/auth/directory"
import { jsonWithSession } from "@/lib/auth/request"

export const runtime = "nodejs"

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { email?: string; password?: string } | null
  const result = await login({ email: body?.email ?? "", password: body?.password ?? "" })
  if (!result.ok) return Response.json(result, { status: 401 })
  return jsonWithSession(result.user.id, { ok: true, user: result.user })
}
