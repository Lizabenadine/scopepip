import { sessionFromRequest } from "@/lib/auth/request"
import { translateToSpanish } from "@/lib/field/auto-translate"

export const runtime = "nodejs"

export async function POST(request: Request) {
  const session = await sessionFromRequest(request)
  if (!session) return Response.json({ ok: false, reason: "Sign in to translate a note." }, { status: 401 })
  const body = (await request.json().catch(() => null)) as { text?: unknown } | null
  const text = typeof body?.text === "string" ? body.text : ""
  if (text.trim().length > 800) {
    return Response.json({ ok: false, reason: "That note is too long to translate." }, { status: 400 })
  }
  const spanish = await translateToSpanish(text)
  return Response.json({ ok: true, spanish })
}
