import { sessionFromRequest } from "@/lib/auth/request"
import { readProposalEvents } from "@/lib/proposals/event-spool"

export const runtime = "nodejs"

export async function GET(request: Request) {
  const session = await sessionFromRequest(request)
  if (!session) return Response.json({ reason: "Sign in first." }, { status: 401 })
  return Response.json({ events: readProposalEvents() })
}
