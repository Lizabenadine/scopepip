import { companyForLeadWebhook, readCompanyBook, writeCompanyBook } from "../../../../../lib/auth/directory.ts"
import { addLeadSpool } from "../../../../../lib/leads/spool.ts"
import { readBody } from "../../../../../lib/leads/receive.ts"
import { landWebhookLead, parseWebhookLead, webhookZapierEvent } from "../../../../../lib/webhooks/leads.ts"
import { postZapierEvent } from "../../../../../lib/zapier/deliver.ts"
import type { ScopeState } from "../../../../../lib/data/seed.ts"

export const runtime = "nodejs"

export async function POST(request: Request, context: { params: Promise<{ token: string }> }) {
  const { token } = await context.params
  const found = await companyForLeadWebhook(token)
  if (!found) return Response.json({ ok: false, reason: "This webhook is not on file." }, { status: 404 })

  const parsed = parseWebhookLead(await readBody(request), new Date().toISOString())
  if (!parsed.ok) return Response.json({ ok: false, reason: parsed.reason }, { status: 400 })

  const lead = { ...parsed.lead, companyId: found.companyId }
  addLeadSpool(lead)

  const saved = await saveLead(found.companyId, found.book.revision, found.book.state, lead)
  if (!saved.ok) return Response.json({ ok: false, reason: "That lead could not be saved." }, { status: 500 })
  return Response.json({ ok: true, created: saved.created })
}

async function saveLead(
  companyId: string,
  revision: number,
  state: ScopeState,
  lead: Parameters<typeof landWebhookLead>[1],
): Promise<{ ok: true; created: boolean } | { ok: false }> {
  let currentRevision = revision
  let current = state
  let deliveredId: string | null = null
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const landed = landWebhookLead(current, lead, lead.createdAt)
    let next = landed.state
    if (landed.created && landed.estimateId && !deliveredId) {
      const event = webhookZapierEvent(next, landed.estimateId)
      if (event && (await postZapierEvent(next.estimateSettings.zapierWebhookUrl, event))) deliveredId = event.id
    }
    if (deliveredId && !(next.zapierDelivered ?? []).includes(deliveredId)) {
      next = { ...next, zapierDelivered: [...(next.zapierDelivered ?? []), deliveredId].slice(-200) }
    }
    const saved = await writeCompanyBook(companyId, currentRevision, next)
    if (saved.ok) return { ok: true, created: landed.created }
    if (!("state" in saved)) return { ok: false }
    const fresh = await readCompanyBook(companyId)
    if (!fresh) return { ok: false }
    current = fresh.state
    currentRevision = fresh.revision
  }
  return { ok: false }
}
