import { changeOrderResponse } from "@/lib/change-orders/respond"

export const runtime = "nodejs"

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params
  return changeOrderResponse(request, id)
}
