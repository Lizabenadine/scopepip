import { companyBySlug } from "@/lib/auth/directory"
import { readBody, storeLead } from "@/lib/leads/receive"
import type { InboundLeadSource } from "@/lib/types"

export const runtime = "nodejs"

const SOURCES: Record<string, InboundLeadSource> = {
  website: "website",
  thumbtack: "thumbtack",
  angi: "angi",
  "google-lsa": "google_lsa",
  facebook: "facebook",
}

export async function GET(request: Request, context: { params: Promise<{ source: string }> }) {
  const { source } = await context.params
  if (source !== "facebook") return Response.json({ ok: false }, { status: 404 })
  const url = new URL(request.url)
  const mode = url.searchParams.get("hub.mode")
  const token = url.searchParams.get("hub.verify_token")
  const challenge = url.searchParams.get("hub.challenge")
  const expected = process.env.FACEBOOK_VERIFY_TOKEN
  if (mode === "subscribe" && challenge && expected && token === expected) {
    return new Response(challenge, { headers: { "content-type": "text/plain" } })
  }
  return Response.json({ ok: false }, { status: 403 })
}

export async function POST(request: Request, context: { params: Promise<{ source: string }> }) {
  const { source } = await context.params
  const leadSource = SOURCES[source]
  if (!leadSource) return Response.json({ ok: false }, { status: 404 })
  const slug = new URL(request.url).searchParams.get("company")?.trim()
  const companyId = slug ? companyBySlug(slug)?.id : undefined
  return storeLead(leadSource, await readBody(request), companyId)
}
