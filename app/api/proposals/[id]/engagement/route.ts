import { proposalEventResponse } from "@/lib/proposals/respond"

export const runtime = "nodejs"

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params
  return proposalEventResponse(request, id)
}
