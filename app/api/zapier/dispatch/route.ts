import { zapierTarget, type ZapierEvent } from "@/lib/zapier/events"

export const runtime = "nodejs"

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null)
    const record = body && typeof body === "object" ? (body as { url?: unknown; events?: unknown }) : {}
    const url = zapierTarget(typeof record.url === "string" ? record.url : "")
    if (!url) return Response.json({ ok: false, reason: "Zapier needs an https webhook URL." }, { status: 400 })
    const events = Array.isArray(record.events) ? record.events.filter(isEvent).slice(0, 20) : []
    const results: { id: string; delivery: "sent" | "failed" }[] = []
    for (const event of events) {
      try {
        const response = await fetch(url, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(event),
        })
        results.push({ id: event.id, delivery: response.ok ? "sent" : "failed" })
      } catch {
        results.push({ id: event.id, delivery: "failed" })
      }
    }
    return Response.json({ ok: true, results })
  } catch {
    return Response.json({ ok: false, reason: "Zapier could not be reached." })
  }
}

function isEvent(value: unknown): value is ZapierEvent {
  if (!value || typeof value !== "object") return false
  const event = value as ZapierEvent
  return typeof event.id === "string" && typeof event.event === "string" && typeof event.occurredAt === "string"
}
