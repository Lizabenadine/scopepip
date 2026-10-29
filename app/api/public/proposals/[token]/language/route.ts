import { rememberProposalLanguage } from "@/lib/auth/directory"

export const runtime = "nodejs"

export async function POST(request: Request, context: { params: Promise<{ token: string }> }) {
  const { token } = await context.params
  if (!/^[a-z0-9]{6,40}$/i.test(token)) return Response.json({ ok: false }, { status: 404 })
  const body = (await request.json().catch(() => null)) as { language?: unknown } | null
  const language = body?.language === "es" ? "es" : body?.language === "en" ? "en" : null
  if (!language) return Response.json({ ok: false }, { status: 400 })
  const saved = await rememberProposalLanguage(token, language)
  if (!saved) return Response.json({ ok: false }, { status: 404 })
  return Response.json({ ok: true, language })
}
