import { publicProposal } from "@/lib/auth/directory"
import { isProposalToken } from "@/lib/proposals/token"

export const runtime = "nodejs"

export async function GET(_request: Request, context: { params: Promise<{ token: string }> }) {
  const { token } = await context.params
  if (!isProposalToken(token)) return Response.json({ reason: "This proposal link is not valid." }, { status: 404 })
  const view = await publicProposal(token)
  if (!view) return Response.json({ reason: "This proposal link is not valid." }, { status: 404 })
  return Response.json(view)
}
