import { acceptPublicProposal } from "@/lib/auth/directory"
import { syncAcceptance } from "@/lib/proposals/sync"
import type { AcceptanceInput } from "@/lib/proposals/accept"

export const runtime = "nodejs"

export async function POST(request: Request, context: { params: Promise<{ token: string }> }) {
  const { token } = await context.params
  if (!/^[a-z0-9]{6,40}$/i.test(token)) {
    return Response.json({ ok: false, reason: "This proposal link is not valid." }, { status: 404 })
  }
  const body = (await request.json().catch(() => null)) as Partial<AcceptanceInput> | null
  const signedName = typeof body?.signedName === "string" ? body.signedName : ""
  const signaturePayload = typeof body?.signaturePayload === "string" ? body.signaturePayload : ""
  const selectedLineIds = Array.isArray(body?.selectedLineIds)
    ? body.selectedLineIds.filter((id): id is string => typeof id === "string").slice(0, 80)
    : []
  if (signaturePayload.length > 1_500_000) {
    return Response.json({ ok: false, reason: "That signature is too large." }, { status: 400 })
  }
  const signedAt = new Date().toISOString()
  const result = acceptPublicProposal(token, { signedName, signaturePayload, signedAt, selectedLineIds })
  if (!result.ok) return Response.json(result, { status: 400 })
  void syncAcceptance(token, { signedName, signaturePayload, signedAt, selectedLineIds }).catch(() => undefined)
  return Response.json({ ok: true, estimate: result.estimate })
}
