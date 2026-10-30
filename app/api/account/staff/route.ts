import { addStaff, listPeople } from "@/lib/auth/directory"
import { sessionFromRequest } from "@/lib/auth/request"

export const runtime = "nodejs"

export async function GET(request: Request) {
  const session = await sessionFromRequest(request)
  if (!session) return Response.json({ reason: "Sign in first." }, { status: 401 })
  return Response.json({ people: await listPeople(session.id) })
}

export async function POST(request: Request) {
  const session = await sessionFromRequest(request)
  if (!session) return Response.json({ reason: "Sign in first." }, { status: 401 })
  if (session.role !== "owner") {
    return Response.json({ ok: false, reason: "Only the owner can add a person." }, { status: 403 })
  }
  const body = (await request.json().catch(() => null)) as {
    name?: string
    email?: string
    password?: string
    role?: string
  } | null
  const role = body?.role === "estimator" ? "estimator" : "project_manager"
  const result = await addStaff(session.id, {
    name: body?.name ?? "",
    email: body?.email ?? "",
    password: body?.password ?? "",
    role,
  })
  if (!result.ok) return Response.json(result, { status: 400 })
  return Response.json({ ok: true, user: { name: result.user.name, email: result.user.email, role: result.user.role } })
}
