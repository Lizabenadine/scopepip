import { signup } from "@/lib/auth/directory"
import { jsonWithSession } from "@/lib/auth/request"

export const runtime = "nodejs"

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    name?: string
    email?: string
    password?: string
    companyName?: string
  } | null
  const result = signup({
    name: body?.name ?? "",
    email: body?.email ?? "",
    password: body?.password ?? "",
    companyName: body?.companyName ?? "",
  })
  if (!result.ok) return Response.json(result, { status: 400 })
  return jsonWithSession(result.user.id, { ok: true, user: result.user })
}
