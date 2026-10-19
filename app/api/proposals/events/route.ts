import { readProposalEvents } from "@/lib/proposals/event-spool"

export const runtime = "nodejs"

export function GET() {
  return Response.json({ events: readProposalEvents() })
}
