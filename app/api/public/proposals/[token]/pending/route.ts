import { recordPendingSignatureByToken } from "@/lib/auth/directory"
import { isProposalToken } from "@/lib/proposals/token"

export const runtime = "nodejs"

export async function POST(request: Request, context: { params: Promise<{ token: string }> }) {
  const { token } = await context.params
  if (!isProposalToken(token)) {
    return Response.json({ ok: false, reason: "This proposal link is not valid." }, { status: 404 })
  }
  const body = await request.json().catch(() => null)
  const record = body && typeof body === "object" ? (body as { lineIds?: unknown; clientSignatureUrl?: unknown }) : null
  const lineIds = Array.isArray(record?.lineIds) ? record.lineIds.filter((item): item is string => typeof item === "string") : []
  const clientSignatureUrl = typeof record?.clientSignatureUrl === "string" ? record.clientSignatureUrl : ""
  const result = await recordPendingSignatureByToken(token, { lineIds, clientSignatureUrl })
  if (!result.ok) return Response.json(result, { status: 400 })
  return Response.json(result)
}
