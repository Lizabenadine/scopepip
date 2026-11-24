import { saveAccountLanguage } from "@/lib/auth/directory"
import { jsonWithOfficeSession, sessionFromRequest } from "@/lib/auth/request"

export const runtime = "nodejs"

export async function POST(request: Request) {
  const session = await sessionFromRequest(request)
  if (!session) return Response.json({ ok: false }, { status: 401 })
  const body = (await request.json().catch(() => null)) as { language?: unknown } | null
  const language = body?.language === "es" ? "es" : body?.language === "en" ? "en" : null
  if (!language) return Response.json({ ok: false }, { status: 400 })
  const saved = await saveAccountLanguage(session.id, language)
  const effectiveLang = saved ? saved.language : language
  return jsonWithOfficeSession({ ...session, language: effectiveLang }, { ok: true, language: effectiveLang })
}
