import { handleVerifiedPaddleEvent } from "@/lib/billing/paddle-fulfillment"
import { paddleServerEnvironment, verifyPaddleWebhook } from "@/lib/billing/paddle-server"


export const runtime = "nodejs"

export function GET() {
  return Response.json({
    ok: true,
    detail: "This address receives signed Paddle events. Opening it in a browser does not send one.",
  })
}

export async function POST(request: Request) {
  const secret = process.env.PADDLE_WEBHOOK_SECRET?.trim() || ""
  if (!secret) {
    return Response.json({ ok: false, reason: "PADDLE_WEBHOOK_SECRET is not set." }, { status: 500 })
  }
  let environment: "live" | "sandbox"
  try {
    environment = paddleServerEnvironment()
  } catch {
    return Response.json({ ok: false, reason: "PADDLE_ENV must be live or sandbox." }, { status: 500 })
  }
  const raw = await request.text()
  const signature = request.headers.get("paddle-signature")?.trim() || ""
  let event: Awaited<ReturnType<typeof verifyPaddleWebhook>>
  try {
    event = await verifyPaddleWebhook(raw, signature, secret, environment)
  } catch (error) {
    const message = error instanceof Error ? error.message : ""
    const status = /signature/i.test(message) || !signature ? 401 : 400
    return Response.json({ ok: false, reason: "This Paddle webhook was not signed." }, { status })
  }
  try {
    const result = await handleVerifiedPaddleEvent(event)
    return Response.json({ ok: true, ...result })
  } catch {
    return Response.json({ ok: false, reason: "The subscription could not be saved." }, { status: 502 })
  }
}
