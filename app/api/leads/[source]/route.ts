import { companyBySlug, readCompanyBook, writeCompanyBook } from "../../../../lib/auth/directory.ts"
import { readBody, storeLead } from "../../../../lib/leads/receive.ts"
import { addLeadSpool } from "../../../../lib/leads/spool.ts"
import { fieldDataLead } from "../../../../lib/leads/parse.ts"
import { landWebhookLead } from "../../../../lib/webhooks/leads.ts"
import {
  fetchFacebookLeadDetails,
  getCompanyForFacebookPage,
  getDecryptedFacebookToken,
} from "../../../../lib/facebook/credentials.ts"
import type { InboundLeadSource } from "../../../../lib/types.ts"
import type { InboundLead } from "../../../../lib/leads/types.ts"

export const runtime = "nodejs"

const SOURCES: Record<string, InboundLeadSource> = {
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
  const expected = process.env.FACEBOOK_VERIFY_TOKEN?.trim() || "scopepipe_meta_leadgen_verify"

  if (mode === "subscribe" && challenge && token === expected) {
    return new Response(challenge, {
      status: 200,
      headers: { "content-type": "text/plain" },
    })
  }
  return Response.json({ ok: false, error: "Invalid verification token" }, { status: 403 })
}

export async function POST(request: Request, context: { params: Promise<{ source: string }> }) {
  const { source } = await context.params
  const leadSource = SOURCES[source]
  if (!leadSource) return Response.json({ ok: false }, { status: 404 })

  const url = new URL(request.url)
  const slug = url.searchParams.get("company")?.trim()
  const queryCompanyId = slug ? (await companyBySlug(slug))?.id : undefined
  const rawBody = await readBody(request)

  if (source === "facebook") {
    return handleFacebookLeadAdWebhook(rawBody, queryCompanyId)
  }

  return storeLead(leadSource, rawBody, queryCompanyId)
}

async function handleFacebookLeadAdWebhook(body: unknown, fallbackCompanyId?: string): Promise<Response> {
  const root = body && typeof body === "object" && !Array.isArray(body) ? (body as Record<string, unknown>) : null
  if (!root) return Response.json({ ok: false, reason: "Invalid JSON payload" }, { status: 400 })

  const entries = Array.isArray(root.entry) ? root.entry : []

  // If this is a Meta Lead Ads webhook event with entries
  if (entries.length > 0) {
    const now = new Date().toISOString()
    const processedIds: string[] = []

    for (const entry of entries) {
      if (!entry || typeof entry !== "object") continue
      const entryObj = entry as Record<string, unknown>
      const pageId = typeof entryObj.id === "string" ? entryObj.id : ""
      const changes = Array.isArray(entryObj.changes) ? entryObj.changes : []

      for (const change of changes) {
        if (!change || typeof change !== "object") continue
        const changeObj = change as Record<string, unknown>
        const val = changeObj.value && typeof changeObj.value === "object" ? (changeObj.value as Record<string, unknown>) : null
        if (!val) continue

        const effectivePageId = typeof val.page_id === "string" ? val.page_id : pageId
        const mapping = effectivePageId ? await getCompanyForFacebookPage(effectivePageId) : null
        const targetCompanyId = mapping?.companyId || fallbackCompanyId

        // Requirement 5: Prevent leads from being assigned to the wrong contractor
        if (!targetCompanyId) {
          // Unmapped page: do not assign to an arbitrary contractor
          continue
        }

        let lead: InboundLead | null = null

        // 1. Direct field_data in webhook
        if (Array.isArray(val.field_data)) {
          lead = fieldDataLead(val, now)
        }

        // 2. Fetch from Meta Graph API if leadgen_id is present
        const leadgenId = typeof val.leadgen_id === "string" ? val.leadgen_id.trim() : ""
        if (!lead && leadgenId) {
          const pageToken = await getDecryptedFacebookToken(targetCompanyId)
          if (pageToken) {
            const leadDetails = await fetchFacebookLeadDetails(leadgenId, pageToken)
            if (leadDetails) {
              lead = fieldDataLead(leadDetails, now)
            }
          }
        }

        if (lead) {
          const finalizedLead: InboundLead = { ...lead, companyId: targetCompanyId }
          addLeadSpool(finalizedLead)
          await saveToCompanyBook(targetCompanyId, finalizedLead)
          processedIds.push(finalizedLead.id)
        }
      }
    }

    return Response.json({ ok: true, stored: processedIds.length, ids: processedIds })
  }

  // Fallback for direct form post or testing payload
  return storeLead("facebook", body, fallbackCompanyId)
}

async function saveToCompanyBook(companyId: string, lead: InboundLead): Promise<void> {
  try {
    const book = await readCompanyBook(companyId)
    if (!book) return
    const landed = landWebhookLead(book.state, lead, lead.createdAt)
    await writeCompanyBook(companyId, book.revision, landed.state)
  } catch {
    // Spool will still be processed when client pulls
  }
}
