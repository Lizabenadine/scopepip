import { addSpool, readSpool, type SpoolMessage } from "@/lib/messages/spool"

export const runtime = "nodejs"

export function GET() {
  return Response.json({ messages: readSpool() })
}

export async function POST(request: Request) {
  const message = await readInbound(request)
  if (!message) return Response.json({ ok: false }, { status: 400 })
  addSpool(message)
  return Response.json({ ok: true, id: message.id })
}

async function readInbound(request: Request): Promise<SpoolMessage | null> {
  const contentType = request.headers.get("content-type") ?? ""
  if (contentType.includes("application/json")) {
    const body = await request.json().catch(() => null)
    if (!body || typeof body !== "object") return null
    const record = body as Record<string, unknown>
    const from = typeof record.from === "string" ? record.from.slice(0, 40) : ""
    const text = typeof record.body === "string" ? record.body.slice(0, 5000) : ""
    const mediaUrls = httpMedia(record.mediaUrls)
    if (!from || (!text && mediaUrls.length === 0)) return null
    const id = typeof record.id === "string" && record.id.trim() ? record.id.trim().slice(0, 80) : crypto.randomUUID()
    return { id, from, body: text, mediaUrls, createdAt: new Date().toISOString() }
  }
  const form = await request.formData().catch(() => null)
  if (!form) return null
  const from = String(form.get("From") ?? "").slice(0, 40)
  const text = String(form.get("Body") ?? "").slice(0, 5000)
  const mediaUrls: string[] = []
  const count = Number(form.get("NumMedia") ?? 0)
  for (let index = 0; index < Math.min(count, 4); index += 1) {
    const url = String(form.get(`MediaUrl${index}`) ?? "")
    if (url.startsWith("https://") || url.startsWith("http://")) mediaUrls.push(url.slice(0, 500))
  }
  if (!from || (!text && mediaUrls.length === 0)) return null
  const sid = String(form.get("MessageSid") ?? "").trim()
  return {
    id: sid.slice(0, 80) || crypto.randomUUID(),
    from,
    body: text,
    mediaUrls,
    createdAt: new Date().toISOString(),
  }
}

function httpMedia(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value
    .filter((item): item is string => typeof item === "string" && (item.startsWith("https://") || item.startsWith("http://")))
    .slice(0, 4)
    .map((item) => item.slice(0, 500))
}
