import { recordPendingSignature } from "@/lib/auth/directory"

export const runtime = "nodejs"

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params
  if (!/^[a-z0-9-]{4,80}$/i.test(id)) {
    return Response.json({ ok: false, reason: "This estimate is not on file." }, { status: 404 })
  }
  const body = await request.json().catch(() => null)
  const record = body && typeof body === "object" ? (body as { lineIds?: unknown; clientSignatureUrl?: unknown }) : null
  const lineIds = Array.isArray(record?.lineIds) ? record.lineIds.filter((item): item is string => typeof item === "string") : []
  const clientSignatureUrl = typeof record?.clientSignatureUrl === "string" ? record.clientSignatureUrl : ""
  const result = await recordPendingSignature(id, { lineIds, clientSignatureUrl })
  if (!result.ok) return Response.json(result, { status: 400 })
  return Response.json(result)
}
