import { answerPublicWorkOrder, publicWorkOrderOffer } from "@/lib/auth/directory"

export const runtime = "nodejs"

function validToken(token: string): boolean {
  return /^[a-f0-9]{12}$/.test(token)
}

export async function GET(_request: Request, context: { params: Promise<{ token: string }> }) {
  const { token } = await context.params
  if (!validToken(token)) {
    return Response.json({ reason: "This work order link is not valid." }, { status: 404 })
  }
  const offer = await publicWorkOrderOffer(token)
  if (!offer) return Response.json({ reason: "This work order link is not valid." }, { status: 404 })
  return Response.json(offer)
}

export async function POST(request: Request, context: { params: Promise<{ token: string }> }) {
  const { token } = await context.params
  if (!validToken(token)) {
    return Response.json({ ok: false, reason: "This work order link is not valid." }, { status: 404 })
  }
  const body = (await request.json().catch(() => null)) as { decision?: unknown } | null
  const decision = body?.decision === "accept" || body?.decision === "decline" ? body.decision : null
  if (!decision) return Response.json({ ok: false, reason: "Choose accept or pass." }, { status: 400 })
  const result = await answerPublicWorkOrder(token, decision, new Date().toISOString())
  if (!result.ok) return Response.json(result, { status: 400 })
  const offer = await publicWorkOrderOffer(token)
  return Response.json({ ok: true, offer })
}
