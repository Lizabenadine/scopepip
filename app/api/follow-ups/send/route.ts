import { deliverFollowUp, followUpTransport } from "@/lib/follow-ups/deliver"
import type { FollowUpChannel } from "@/lib/follow-ups/types"

export const runtime = "nodejs"

export async function GET() {
  return Response.json(followUpTransport())
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  if (!body || typeof body !== "object") return Response.json({ delivery: "skipped", detail: "Missing message." })
  const record = body as Record<string, unknown>
  const channel: FollowUpChannel | null = record.channel === "email" || record.channel === "text" ? record.channel : null
  const to = typeof record.to === "string" ? record.to.slice(0, 200) : ""
  const subject = typeof record.subject === "string" ? record.subject.slice(0, 200) : ""
  const message = typeof record.body === "string" ? record.body.slice(0, 5000) : ""
  const fromName = typeof record.fromName === "string" ? record.fromName.slice(0, 120) : "ScopePipe"
  if (!channel || !to || !message.trim()) {
    return Response.json({ delivery: "skipped", detail: "The message is incomplete." })
  }
  const result = await deliverFollowUp({ channel, to, subject, body: message, fromName })
  return Response.json(result)
}
