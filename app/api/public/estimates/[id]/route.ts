import { companyEstimate } from "@/lib/auth/directory"
import { sessionFromRequest } from "@/lib/auth/request"

export const runtime = "nodejs"

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await sessionFromRequest(request)
  if (!session) return Response.json({ reason: "Sign in first." }, { status: 401 })
  const { id } = await context.params
  if (!/^[a-z0-9-]{4,80}$/i.test(id)) return Response.json({ reason: "This estimate is not on file." }, { status: 404 })
  const view = await companyEstimate(session.companyId, id)
  if (!view) return Response.json({ reason: "This estimate is not on file." }, { status: 404 })
  return Response.json(view)
}
