import { publicEstimate } from "@/lib/auth/directory"

export const runtime = "nodejs"

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params
  if (!/^[a-z0-9-]{4,80}$/i.test(id)) return Response.json({ reason: "This estimate is not on file." }, { status: 404 })
  const view = publicEstimate(id)
  if (!view) return Response.json({ reason: "This estimate is not on file." }, { status: 404 })
  return Response.json(view)
}
