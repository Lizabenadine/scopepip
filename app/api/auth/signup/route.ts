import { signup } from "@/lib/auth/directory"
import { jsonWithOfficeSession, jsonWithSession } from "@/lib/auth/request"

export const runtime = "nodejs"

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    name?: string
    email?: string
    password?: string
    companyName?: string
  } | null
  try {
    const result = await signup({
      name: body?.name ?? "",
      email: body?.email ?? "",
      password: body?.password ?? "",
      companyName: body?.companyName ?? "",
    })
    if (!result.ok) return Response.json(result, { status: 400 })
    if (result.hosted) {
      return jsonWithOfficeSession(result.user, {
        ok: true,
        user: result.user,
        hosted: true,
        passwordHash: result.passwordHash,
        revision: result.revision,
        book: result.book,
      })
    }
    return jsonWithSession(result.user.id, { ok: true, user: result.user })
  } catch (error) {
    const reason = error instanceof Error ? error.message : "The account could not be saved."
    return Response.json({ ok: false, reason }, { status: 500 })
  }
}
