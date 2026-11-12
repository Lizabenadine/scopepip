import { reviewLink } from "../follow-ups/review.ts"
import { zapierTarget } from "../zapier/events.ts"

export type FeaturedStatus = "connected" | "disconnected" | "configured" | "unavailable"

export interface HostConnections {
  companyCam: boolean
  quickbooks: boolean
  googleCalendar: boolean
  facebookLeads: boolean
}

export interface FeaturedIntegration {
  id: string
  name: string
  description: string
  setup: string
  status: FeaturedStatus
  pending: boolean
  action: "Connect" | "Configure" | "Manage"
  href?: string
  anchor?: string
  lastSync?: string
}

export interface FeaturedBook {
  reviewUrl?: string
  zapierWebhookUrl?: string
  companyCamSyncedAt?: string
  quickbooksSyncedAt?: string
  leadWebhookToken?: string
}

export function latestTimestamp(values: Array<string | undefined | null>): string | undefined {
  let best: number | undefined
  let iso: string | undefined
  for (const value of values) {
    if (!value) continue
    const time = Date.parse(value)
    if (!Number.isFinite(time)) continue
    if (best === undefined || time > best) {
      best = time
      iso = new Date(time).toISOString()
    }
  }
  return iso
}

export function featuredIntegrations(book: FeaturedBook, host: HostConnections | null): FeaturedIntegration[] {
  const photos = hostFlag(host, host?.companyCam === true)
  const books = hostFlag(host, host?.quickbooks === true)
  const calendar = hostFlag(host, host?.googleCalendar === true)
  const facebook = hostFlag(host, host?.facebookLeads === true)
  const zapierSaved = zapierTarget(book.zapierWebhookUrl) !== null
  const reviewSaved = reviewLink(book.reviewUrl).length > 0
  const hasWebhook = Boolean(book.leadWebhookToken || zapierSaved)

  return [
    item({
      id: "companycam",
      name: "CompanyCam",
      description: "Jobsite photos, project documentation, and before/after photos.",
      setup: photos.connected
        ? "Token saved. A work order sync stores photos after CompanyCam returns them."
        : "Save an API token in Job photos. Nothing is stored until a work order sync succeeds.",
      ...photos,
      anchor: "job-photos",
      lastSync: book.companyCamSyncedAt,
    }),
    item({
      id: "zapier",
      name: "Zapier",
      description: "Connect Scopepipe to external apps and automate workflows.",
      setup: zapierSaved
        ? "The https hook is saved. New events post there. Older history stays in the office."
        : "Paste an https Catch Hook below. Nothing is posted until that hook is saved.",
      status: zapierSaved ? "connected" : "disconnected",
      pending: false,
      anchor: "zapier-hook",
    }),
    item({
      id: "quickbooks",
      name: "QuickBooks Online",
      description: "Accounting, invoices, and payment synchronization.",
      setup: books.connected
        ? "The host keys are set. An invoice is marked synced only after QuickBooks returns an id."
        : "The host needs the QuickBooks client id, secret, refresh token, and realm id. Sync from Payments.",
      ...books,
      href: "/settings?tab=payments",
      lastSync: book.quickbooksSyncedAt,
    }),
    item({
      id: "google-calendar",
      name: "Google Calendar",
      description: "Appointments and job scheduling.",
      setup: calendar.connected
        ? "Calendar push is set on the host. The feed still updates from the Calendar tab."
        : "Update the feed from the Calendar tab. Direct push needs the Google calendar keys on the host.",
      ...calendar,
      href: "/settings?tab=calendar",
    }),
    item({
      id: "outlook-calendar",
      name: "Outlook Calendar",
      description: "Subscribe to job appointments and visits in Microsoft Outlook via iCal.",
      setup: "Subscribe to your live calendar feed directly in Outlook Web or desktop.",
      status: calendar.connected ? "connected" : "disconnected",
      pending: false,
      href: "/settings?tab=calendar",
    }),
    item({
      id: "google-sheets",
      name: "Google Sheets",
      description: "CSV export for leads, customers, estimates, and jobs. No OAuth needed.",
      setup: "Export your leads, customers, estimates, or jobs to CSV and open in Google Sheets.",
      status: zapierSaved ? "configured" : "disconnected",
      pending: false,
    }),
    item({
      id: "lead-form",
      name: "Website Lead Form",
      description: "Mobile-friendly, embeddable contact form feeding inquiries into your Sales Pipeline.",
      setup: "Embed the form on your website or share the link with prospective clients.",
      status: hasWebhook ? "configured" : "disconnected",
      pending: false,
      anchor: "lead-form-embed",
    }),
    item({
      id: "thumbtack",
      name: "Thumbtack",
      description: "Import customer inquiries from Thumbtack into your pipeline via Zapier.",
      setup: "Connect Thumbtack in Zapier and forward leads into your Scopepipe webhook.",
      status: zapierSaved ? "configured" : "disconnected",
      pending: false,
    }),
    item({
      id: "angi",
      name: "Angi",
      description: "Import homeowner leads from Angi into your pipeline via Zapier.",
      setup: "Connect Angi in Zapier and route new leads into your Scopepipe webhook.",
      status: zapierSaved ? "configured" : "disconnected",
      pending: false,
    }),
    item({
      id: "google-lsa",
      name: "Google Local Services Ads",
      description: "Route phone and message inquiries from Google Screened into your pipeline.",
      setup: "Connect Google Local Services Ads in Zapier and route inquiries to your webhook.",
      status: zapierSaved ? "configured" : "disconnected",
      pending: false,
    }),
    item({
      id: "gmail",
      name: "Gmail",
      description: "Customer email communication.",
      setup: "A Gmail mailbox is not connected. Proposal and follow-up email use the email key in Sending.",
      status: "unavailable",
      pending: false,
      anchor: "integration-sending",
    }),
    item({
      id: "google-business",
      name: "Google Business Profile",
      description: "Review requests and reputation management.",
      setup: reviewSaved
        ? "Finished jobs include this review page. Google does not send reviews back into Scopepipe."
        : "Add an https review page. The link is left off the message until it is saved.",
      status: reviewSaved ? "configured" : "disconnected",
      pending: false,
    }),
    item({
      id: "facebook-instagram",
      name: "Facebook and Instagram",
      description: "Import leads from Facebook & Instagram Lead Ads directly into your pipeline.",
      setup: facebook.connected
        ? "Connected to your Facebook Business Page. Leads from Facebook and Instagram Lead Ads sync automatically."
        : "Connect your Facebook Business Page to automatically import leads from Facebook and Instagram Lead Ads.",
      ...facebook,
    }),
  ]
}

function hostFlag(host: HostConnections | null, connected: boolean): { status: FeaturedStatus; pending: boolean; connected: boolean } {
  if (!host) return { status: "disconnected", pending: true, connected: false }
  return { status: connected ? "connected" : "disconnected", pending: false, connected }
}

function item(input: Omit<FeaturedIntegration, "action">): FeaturedIntegration {
  return { ...input, action: actionFor(input.status, input.pending) }
}

function actionFor(status: FeaturedStatus, pending: boolean): FeaturedIntegration["action"] {
  if (pending) return "Configure"
  if (status === "unavailable") return "Configure"
  if (status === "connected" || status === "configured") return "Manage"
  return "Connect"
}
