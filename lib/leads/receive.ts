import { addLeadSpool } from "./spool.ts"
import { parseInbound } from "./parse.ts"
import type { InboundLeadSource } from "../types.ts"

export async function storeLead(source: InboundLeadSource, body: unknown, companyId?: string): Promise<Response> {
  const parsed = parseInbound(source, body, new Date().toISOString())
  if (!parsed.ok) return Response.json({ ok: false, reason: parsed.reason }, { status: 400 })
  for (const lead of parsed.leads) addLeadSpool(companyId ? { ...lead, companyId } : lead)
  return Response.json({ ok: true, stored: parsed.leads.length, ids: parsed.leads.map((lead) => lead.id) })
}

export async function readBody(request: Request): Promise<unknown> {
  const contentType = request.headers.get("content-type") ?? ""
  if (contentType.includes("application/json")) return request.json().catch(() => null)
  const form = await request.formData().catch(() => null)
  if (!form) return null
  const record: Record<string, string> = {}
  for (const [key, value] of form.entries()) {
    if (typeof value === "string") record[key] = value
  }
  return record
}
