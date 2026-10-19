import { companyBySlug } from "@/lib/auth/directory"
import { sessionFromRequest } from "@/lib/auth/request"
import { readLeadSpool } from "@/lib/leads/spool"
import { readBody, storeLead } from "@/lib/leads/receive"
import { INBOUND_LEAD_SOURCES } from "@/lib/types"

export const runtime = "nodejs"

export async function GET(request: Request) {
  const session = await sessionFromRequest(request)
  if (!session) return Response.json({ leads: [] })
  return Response.json({ leads: readLeadSpool().filter((lead) => lead.companyId === session.companyId) })
}

export async function POST(request: Request) {
  const body = await readBody(request)
  const record = body && typeof body === "object" && !Array.isArray(body) ? (body as Record<string, unknown>) : null
  const source = record && INBOUND_LEAD_SOURCES.find((item) => item === record.source)
  if (!source) return Response.json({ ok: false, reason: "Name the lead source." }, { status: 400 })
  return storeLead(source, body, await companyIdFrom(request))
}

async function companyIdFrom(request: Request): Promise<string | undefined> {
  const slug = new URL(request.url).searchParams.get("company")?.trim()
  if (!slug) return undefined
  return (await companyBySlug(slug))?.id
}
