import { declinePublicProposal } from "@/lib/auth/directory"

export const runtime = "nodejs"

export async function POST(_request: Request, context: { params: Promise<{ token: string }> }) {
  const { token } = await context.params
  if (!/^[a-z0-9]{6,40}$/i.test(token)) {
    return Response.json({ ok: false, reason: "This proposal link is not valid." }, { status: 404 })
  }
  const result = await declinePublicProposal(token, new Date().toISOString())
  if (!result.ok) return Response.json(result, { status: 400 })
  return Response.json({ ok: true, estimate: result.estimate })
}
