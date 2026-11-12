import { declinePublicProposal } from "@/lib/auth/directory"
import { isProposalToken } from "@/lib/proposals/token"

export const runtime = "nodejs"

export async function POST(_request: Request, context: { params: Promise<{ token: string }> }) {
  const { token } = await context.params
  if (!isProposalToken(token)) {
    return Response.json({ ok: false, reason: "This proposal link is not valid." }, { status: 404 })
  }
  const result = await declinePublicProposal(token, new Date().toISOString())
  if (!result.ok) return Response.json(result, { status: 400 })
  return Response.json({ ok: true, estimate: result.estimate })
}
