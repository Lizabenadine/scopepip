import { receiveChangeOrder } from "./receive.ts"

export async function changeOrderResponse(request: Request, workOrderId: string): Promise<Response> {
  try {
    const body = await request.json().catch(() => null)
    if (!body || typeof body !== "object") {
      return Response.json(
        { error: "Missing required change order details or signature." },
        { status: 400 },
      )
    }
    const record = body as { items?: unknown; subtotal?: unknown; clientSignatureUrl?: unknown }
    const received = receiveChangeOrder(workOrderId, {
      items: record.items,
      subtotal: record.subtotal,
      clientSignatureUrl: record.clientSignatureUrl,
    })
    if (!received.ok) return Response.json({ error: received.error }, { status: 400 })

    return Response.json({
      success: true,
      changeOrderId: received.changeOrder.id,
      workOrderId,
      amountAdded: received.changeOrder.subtotal,
      message: "Change order applied and invoice updated instantly.",
      changeOrder: received.changeOrder,
      lineItems: received.lineItems,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not apply the change order."
    return Response.json({ error: message }, { status: 500 })
  }
}
