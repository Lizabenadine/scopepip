import { supabaseAdmin } from "../supabase/admin.ts"
import { zapierTarget } from "../zapier/events.ts"

export interface WebhookSubscription {
  url: string
  event: string
  active: boolean
  company_id: string
}

const EVENT_NAME = /^[a-z][a-z0-9._-]{0,79}$/

/** Https hooks subscribed to this event. A row with event `*` receives every event. */
export function selectWebhookUrls(rows: WebhookSubscription[], event: string, companyId?: string): string[] {
  const urls: string[] = []
  for (const row of rows) {
    if (!row.active) continue
    if (companyId && row.company_id !== companyId) continue
    if (row.event !== event && row.event !== "*") continue
    const url = zapierTarget(row.url)
    if (url && !urls.includes(url)) urls.push(url)
  }
  return urls.slice(0, 20)
}

/** Look up active hooks and post without waiting on their replies. */
export async function sendWebhook(event: string, payload: unknown, companyId?: string): Promise<void> {
  if (!EVENT_NAME.test(event)) return
  const urls = await loadActiveWebhookUrls(event, companyId)
  const body = JSON.stringify({ event, payload })
  for (const url of urls) {
    void fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body,
    }).catch(() => undefined)
  }
}

async function loadActiveWebhookUrls(event: string, companyId?: string): Promise<string[]> {
  const admin = supabaseAdmin()
  if (!admin) return []
  let query = admin.from("outbound_webhooks").select("url,event,active,company_id").eq("active", true).in("event", [event, "*"]).limit(20)
  if (companyId) query = query.eq("company_id", companyId)
  const { data, error } = await query
  if (error || !Array.isArray(data)) return []
  return selectWebhookUrls(data as WebhookSubscription[], event, companyId)
}
