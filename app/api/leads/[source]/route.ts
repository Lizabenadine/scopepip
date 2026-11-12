import { companyBySlug, readCompanyBook, writeCompanyBook } from "../../../../lib/auth/directory.ts"
import { readBody, storeLead } from "../../../../lib/leads/receive.ts"
import { addLeadSpool } from "../../../../lib/leads/spool.ts"
import { fieldDataLead } from "../../../../lib/leads/parse.ts"
import { landWebhookLead } from "../../../../lib/webhooks/leads.ts"
import {
  fetchFacebookLeadDetails,
  fetchFacebookUserProfile,
  getCompanyForFacebookPage,
  getDecryptedFacebookToken,
  verifyFacebookWebhookSignature,
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

  if (source === "facebook") {
    const rawText = await request.text()
    const signature = request.headers.get("x-hub-signature-256")
    if (signature && !verifyFacebookWebhookSignature(rawText, signature)) {
      return Response.json({ ok: false, error: "Invalid webhook signature" }, { status: 403 })
    }
    let rawBody: unknown = null
    try {
      rawBody = rawText ? JSON.parse(rawText) : null
    } catch {
      return Response.json({ ok: false, reason: "Invalid JSON payload" }, { status: 400 })
    }
    return handleFacebookWebhook(rawBody, queryCompanyId)
  }

  const rawBody = await readBody(request)
  return storeLead(leadSource, rawBody, queryCompanyId)
}

async function handleFacebookWebhook(body: unknown, fallbackCompanyId?: string): Promise<Response> {
  const root = body && typeof body === "object" && !Array.isArray(body) ? (body as Record<string, unknown>) : null
  if (!root) return Response.json({ ok: false, reason: "Invalid JSON payload" }, { status: 400 })

  const entries = Array.isArray(root.entry) ? root.entry : []

  // If this is a Meta webhook event with entries (Lead Ads or Messenger)
  if (entries.length > 0) {
    const now = new Date().toISOString()
    const processedIds: string[] = []

    for (const entry of entries) {
      if (!entry || typeof entry !== "object") continue
      const entryObj = entry as Record<string, unknown>
      const pageId = typeof entryObj.id === "string" ? entryObj.id : ""

      // 1. Process Lead Ads (if changes array is present)
      const changes = Array.isArray(entryObj.changes) ? entryObj.changes : []
      for (const change of changes) {
        if (!change || typeof change !== "object") continue
        const changeObj = change as Record<string, unknown>
        const val = changeObj.value && typeof changeObj.value === "object" ? (changeObj.value as Record<string, unknown>) : null
        if (!val) continue

        const effectivePageId = typeof val.page_id === "string" ? val.page_id : pageId
        const mapping = effectivePageId ? await getCompanyForFacebookPage(effectivePageId) : null
        const targetCompanyId = mapping?.companyId || fallbackCompanyId

        // Contractor data isolation: prevent assigning to wrong contractor
        if (!targetCompanyId) continue

        let lead: InboundLead | null = null

        // Direct field_data in webhook
        if (Array.isArray(val.field_data)) {
          lead = fieldDataLead(val, now)
        }

        // Fetch from Meta Graph API if leadgen_id is present
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

      // 2. Process Messenger Inquiries (if messaging array is present)
      const messaging = Array.isArray(entryObj.messaging) ? entryObj.messaging : []
      for (const msg of messaging) {
        if (!msg || typeof msg !== "object") continue
        const msgObj = msg as Record<string, unknown>
        const messageData = msgObj.message && typeof msgObj.message === "object" ? (msgObj.message as Record<string, unknown>) : null

        // Ignore echoes (messages sent by the page) and non-message events (read receipts, delivery)
        if (!messageData || messageData.is_echo === true) continue

        const senderObj = msgObj.sender && typeof msgObj.sender === "object" ? (msgObj.sender as Record<string, unknown>) : null
        const recipientObj = msgObj.recipient && typeof msgObj.recipient === "object" ? (msgObj.recipient as Record<string, unknown>) : null
        const senderId = typeof senderObj?.id === "string" ? senderObj.id.trim() : ""
        const recipientId = typeof recipientObj?.id === "string" ? recipientObj.id.trim() : pageId

        if (!senderId || !recipientId) continue

        const mapping = await getCompanyForFacebookPage(recipientId)
        const targetCompanyId = mapping?.companyId || fallbackCompanyId

        // Contractor isolation: only route to contractor owning this page
        if (!targetCompanyId) continue

        const text = typeof messageData.text === "string" ? messageData.text.trim() : ""
        const attachments = Array.isArray(messageData.attachments) ? messageData.attachments : []
        const messageText = text || (attachments.length > 0 ? "[Attached media inquiry]" : "Facebook Messenger inquiry")

        const result = await saveOrUpdateMessengerLead(targetCompanyId, senderId, messageText, now)
        if (result.id) processedIds.push(result.id)
      }
    }

    return Response.json({ ok: true, stored: processedIds.length, ids: processedIds })
  }

  // Fallback for direct form post or testing payload
  return storeLead("facebook", body, fallbackCompanyId)
}

async function saveOrUpdateMessengerLead(
  companyId: string,
  senderId: string,
  messageText: string,
  now: string,
): Promise<{ created: boolean; id: string }> {
  try {
    const book = await readCompanyBook(companyId)
    if (!book) return { created: false, id: "" }

    const psidTag = `[Messenger PSID: ${senderId}]`

    // Look for existing estimate/lead for this sender PSID (threading / deduplication)
    const existingEstimate = book.state.estimates.find(
      (est) => (est.notes && est.notes.includes(psidTag)) || est.inboundLeadId?.includes(senderId),
    )

    if (existingEstimate) {
      // Append follow-up message to the existing lead's notes without creating a duplicate
      const updatedNotes = `${existingEstimate.notes}\n[${now}]: ${messageText}`
      const updatedEstimates = book.state.estimates.map((est) =>
        est.id === existingEstimate.id
          ? {
              ...est,
              notes: updatedNotes,
              updatedAt: now,
            }
          : est,
      )

      const nextState = {
        ...book.state,
        estimates: updatedEstimates,
      }

      await writeCompanyBook(companyId, book.revision, nextState)
      return { created: false, id: existingEstimate.id }
    }

    // New inquiry: fetch sender profile name if possible
    let senderName = "Facebook Messenger Lead"
    const pageToken = await getDecryptedFacebookToken(companyId)
    if (pageToken) {
      const profile = await fetchFacebookUserProfile(senderId, pageToken)
      if (profile?.name) {
        senderName = profile.name
      }
    }

    const newLead: InboundLead = {
      id: `fb_msg_${senderId}_${Date.now()}`,
      source: "facebook",
      name: senderName,
      phone: "",
      email: "",
      address: "",
      message: `${psidTag}\n${messageText}`,
      createdAt: now,
      companyId,
    }

    addLeadSpool(newLead)
    const landed = landWebhookLead(book.state, newLead, now)
    await writeCompanyBook(companyId, book.revision, landed.state)
    return { created: true, id: newLead.id }
  } catch {
    return { created: false, id: "" }
  }
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
