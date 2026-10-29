import { publicProposal, recordProposalMessage } from "@/lib/auth/directory"

export const runtime = "nodejs"

function validToken(token: string): boolean {
  return /^[a-z0-9]{6,40}$/i.test(token)
}

export async function GET(_request: Request, context: { params: Promise<{ token: string }> }) {
  const { token } = await context.params
  if (!validToken(token)) return Response.json({ reason: "This proposal link is not valid." }, { status: 404 })
  const view = await publicProposal(token)
  if (!view) return Response.json({ reason: "This proposal link is not valid." }, { status: 404 })
  return Response.json({ messages: view.estimate.proposalMessages ?? [] })
}

export async function POST(request: Request, context: { params: Promise<{ token: string }> }) {
  const { token } = await context.params
  if (!validToken(token)) return Response.json({ ok: false, reason: "This proposal link is not valid." }, { status: 404 })
  const body = await request.json().catch(() => null)
  const text = body && typeof body === "object" && typeof (body as { body?: unknown }).body === "string" ? (body as { body: string }).body : ""
  const result = await recordProposalMessage(token, text)
  if (!result.ok) return Response.json(result, { status: 400 })
  return Response.json({ ok: true, messages: result.estimate.proposalMessages ?? [] })
}
