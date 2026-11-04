import { reviewLink } from "../follow-ups/review.ts"
import { zapierTarget } from "../zapier/events.ts"

export type FeaturedStatus = "connected" | "disconnected" | "configured" | "unavailable"

export interface HostConnections {
  companyCam: boolean
  quickbooks: boolean
  googleCalendar: boolean
  facebookLeads: boolean
  stripe?: boolean
  paypal?: boolean
  paddle?: boolean
  bank?: boolean
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
  const stripe = hostFlag(host, host?.stripe === true)
  const paypal = hostFlag(host, host?.paypal === true)
  const paddle = hostFlag(host, host?.paddle === true)
  const bank = hostFlag(host, host?.bank === true)
  const calendar = hostFlag(host, host?.googleCalendar === true)
  const facebook = hostFlag(host, host?.facebookLeads === true)
  const zapierSaved = zapierTarget(book.zapierWebhookUrl) !== null
  const reviewSaved = reviewLink(book.reviewUrl).length > 0

  return [
    item({
      id: "companycam",
      name: "CompanyCam",
      description: "Jobsite photos, project documentation, and before/after photos.",
      setup: photos.status === "connected"
        ? "Token saved. A work order sync stores photos after CompanyCam returns them."
        : "Save an API token in Job photos. Nothing is stored until a work order sync succeeds.",
      ...photos,
      anchor: "job-photos",
      lastSync: book.companyCamSyncedAt,
    }),
    item({
      id: "zapier",
      name: "Zapier",
      description: "Connect ScopePipe to external apps and automate workflows.",
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
      setup: books.status === "connected"
        ? "The host keys are set. An invoice is marked synced only after QuickBooks returns an id."
        : "The host needs the QuickBooks client id, secret, refresh token, and realm id. Sync from Payments.",
      ...books,
      href: "/settings?tab=payments",
      lastSync: book.quickbooksSyncedAt,
    }),
    item({
      id: "stripe",
      name: "Stripe",
      description: "Card deposits and invoice payments.",
      setup: stripe.status === "connected"
        ? "This account's Stripe key is saved. A deposit is recorded after Stripe confirms the charge."
        : "Connect this account's Stripe keys under Get paid. A card form is not treated as a connection.",
      ...stripe,
      anchor: "payout-connections",
    }),
    item({
      id: "paypal",
      name: "PayPal",
      description: "PayPal deposits and invoice payments.",
      setup: paypal.status === "connected"
        ? "PayPal accepted this account's keys. A deposit is recorded after PayPal captures the payment."
        : "Connect this account's PayPal client id and secret under Get paid. This stays disconnected until PayPal accepts them.",
      ...paypal,
      anchor: "payout-connections",
    }),
    item({
      id: "paddle",
      name: "Paddle",
      description: "Paddle checkout for job deposits.",
      setup: paddle.status === "connected"
        ? "Paddle accepted this account's API key. ScopePipe's own subscription stays separate."
        : "Connect the Paddle account that should get paid. This is not the ScopePipe subscription.",
      ...paddle,
      anchor: "payout-connections",
    }),
    item({
      id: "bank",
      name: "Bank account",
      description: "Routing and account instructions on the deposit page.",
      setup: bank.status === "connected"
        ? "The deposit page shows this account's bank instructions. The office marks the deposit paid when the transfer arrives."
        : "Add the bank name, account holder, routing number, and account number under Get paid.",
      ...bank,
      anchor: "payout-connections",
    }),
    item({
      id: "google-calendar",
      name: "Google Calendar",
      description: "Appointments and job scheduling.",
      setup: calendar.status === "connected"
        ? "Calendar push is set on the host. The feed still updates from the Calendar tab."
        : "Update the feed from the Calendar tab. Direct push needs the Google calendar keys on the host.",
      ...calendar,
      href: "/settings?tab=calendar",
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
        ? "Finished jobs include this review page. Google does not send reviews back into ScopePipe."
        : "Add an https review page. The link is left off the message until it is saved.",
      status: reviewSaved ? "configured" : "disconnected",
      pending: false,
    }),
    item({
      id: "facebook-instagram",
      name: "Facebook and Instagram",
      description: "Lead generation and marketing.",
      setup: facebook.status === "connected"
        ? "The Facebook verify token is set on the host. Instagram Lead Ads use the same address."
        : "Point Lead Ads at the Facebook address. The host needs FACEBOOK_VERIFY_TOKEN before the check succeeds.",
      ...facebook,
    }),
  ]
}

function hostFlag(host: HostConnections | null, connected: boolean): { status: FeaturedStatus; pending: boolean } {
  if (!host) return { status: "disconnected", pending: true }
  return { status: connected ? "connected" : "disconnected", pending: false }
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
