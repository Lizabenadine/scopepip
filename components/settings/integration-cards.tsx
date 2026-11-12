"use client"

import { useEffect, useState } from "react"
import {
  BookOpen,
  Calendar,
  CalendarDays,
  Camera,
  FileSpreadsheet,
  Globe,
  Layers,
  Mail,
  Share2,
  Sparkles,
  Store,
  Tag,
  Zap,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { usePageOrigin } from "@/lib/browser/client-env"
import { useScope } from "@/lib/data/store"
import { reviewLink } from "@/lib/follow-ups/review"
import {
  featuredIntegrations,
  latestTimestamp,
  type FeaturedIntegration,
  type FeaturedStatus,
  type HostConnections,
} from "@/lib/integrations/center"
import { cn } from "@/lib/utils"

const ICONS = {
  companycam: Camera,
  zapier: Zap,
  quickbooks: BookOpen,
  "google-calendar": CalendarDays,
  "outlook-calendar": Calendar,
  "google-sheets": FileSpreadsheet,
  "lead-form": Globe,
  thumbtack: Tag,
  angi: Layers,
  "google-lsa": Sparkles,
  gmail: Mail,
  "google-business": Store,
  "facebook-instagram": Share2,
} as const

export function IntegrationCards() {
  const scope = useScope()
  const [host, setHost] = useState<HostConnections | null>(null)
  const [hostDetail, setHostDetail] = useState("")
  const [openId, setOpenId] = useState<string | null>(null)
  const [reviewDraft, setReviewDraft] = useState(scope.estimateSettings.reviewUrl ?? "")
  const [reviewDetail, setReviewDetail] = useState("")
  const [copiedDetail, setCopiedDetail] = useState("")
  const origin = usePageOrigin()

  const inboundToken = scope.estimateSettings.leadWebhookToken
  const inboundUrl = origin && inboundToken ? `${origin}/api/webhooks/leads/${inboundToken}` : ""
  const leadFormUrl = origin && inboundToken ? `${origin}/lead-form/${inboundToken}` : ""
  const embedCode = leadFormUrl
    ? `<iframe src="${leadFormUrl}" width="100%" height="560" frameborder="0" style="border:none;border-radius:12px;"></iframe>`
    : ""

  const cards = featuredIntegrations(
    {
      reviewUrl: scope.estimateSettings.reviewUrl,
      zapierWebhookUrl: scope.estimateSettings.zapierWebhookUrl,
      companyCamSyncedAt: latestTimestamp(scope.workOrders.map((order) => order.companyCamSyncedAt)),
      quickbooksSyncedAt: latestTimestamp(scope.estimates.map((estimate) => estimate.quickbooksSyncedAt)),
      leadWebhookToken: scope.estimateSettings.leadWebhookToken,
    },
    host,
  )

  useEffect(() => {
    let cancelled = false
    function loadStatus() {
      fetch("/api/integrations/status")
        .then((response) => response.json().then((payload: Partial<HostConnections> & { ok?: boolean }) => ({ response, payload })))
        .then(({ response, payload }) => {
          if (cancelled) return
          if (!response.ok || payload.ok === false) {
            setHost({ companyCam: false, quickbooks: false, googleCalendar: false, facebookLeads: false })
            setHostDetail("Connection status could not be checked. Nothing is shown as connected.")
            return
          }
          setHost({
            companyCam: payload.companyCam === true,
            quickbooks: payload.quickbooks === true,
            googleCalendar: payload.googleCalendar === true,
            facebookLeads: payload.facebookLeads === true,
          })
          setHostDetail("")
        })
        .catch(() => {
          if (cancelled) return
          setHost({ companyCam: false, quickbooks: false, googleCalendar: false, facebookLeads: false })
          setHostDetail("Connection status could not be checked. Nothing is shown as connected.")
        })
    }
    loadStatus()
    window.addEventListener("scopepipe:integrations-refresh", loadStatus)
    return () => {
      cancelled = true
      window.removeEventListener("scopepipe:integrations-refresh", loadStatus)
    }
  }, [])

  function activate(item: FeaturedIntegration) {
    if (item.href) return
    setOpenId(openId === item.id ? null : item.id)
    if (item.anchor) document.getElementById(item.anchor)?.scrollIntoView({ behavior: "smooth", block: "start" })
  }

  function saveReview() {
    const link = reviewLink(reviewDraft)
    if (reviewDraft.trim() && !link) {
      setReviewDetail("The review page needs an https address.")
      return
    }
    scope.updateEstimateSettings({ ...scope.estimateSettings, reviewUrl: link })
    setReviewDraft(link)
    setReviewDetail(link ? "Review link saved." : "Review link removed.")
  }

  function downloadCsv(type: "leads" | "customers" | "estimates" | "jobs") {
    const link = document.createElement("a")
    link.href = `/api/export/csv?type=${type}`
    link.download = `scopepipe-${type}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  async function copyToClipboard(text: string, label: string) {
    if (!text) return
    try {
      await navigator.clipboard.writeText(text)
      setCopiedDetail(`${label} copied to clipboard!`)
      setTimeout(() => setCopiedDetail(""), 2500)
    } catch {
      setCopiedDetail("Please copy manually.")
    }
  }

  return (
    <section className="flex flex-col gap-3" data-testid="integration-cards">
      <div>
        <h2 className="text-lg font-semibold">Integrations</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Connect your tools and services. Leads, appointments, and exports sync directly with your pipeline.
        </p>
        {hostDetail ? <p className="mt-2 text-sm text-destructive">{hostDetail}</p> : null}
        {copiedDetail ? <p className="mt-2 text-sm text-cyan-600 font-medium">{copiedDetail}</p> : null}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {cards.map((item) => {
          const Icon = ICONS[item.id as keyof typeof ICONS] || Zap
          const expanded = openId === item.id
          return (
            <article
              key={item.id}
              className="flex flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
              data-testid={`integration-${item.id}`}
            >
              <div className="flex items-start gap-3">
                <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-[#02182F] text-[#05C9FF]">
                  <Icon className="size-5" aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold">{item.name}</h3>
                    <StatusBadge status={item.status} pending={item.pending} />
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{item.description}</p>
                </div>
              </div>
              <p className="mt-3 text-sm text-slate-700">{item.setup}</p>
              {item.lastSync ? (
                <p className="mt-2 text-sm text-muted-foreground" data-testid={`integration-sync-${item.id}`}>
                  Last successful sync {formatSync(item.lastSync)}
                </p>
              ) : null}
              <div className="mt-4">
                {item.href ? (
                  <Button
                    type="button"
                    className="h-11"
                    nativeButton={false}
                    render={<a href={item.href} />}
                    data-testid={`integration-action-${item.id}`}
                    disabled={item.pending}
                  >
                    {item.pending ? "Checking" : item.action}
                  </Button>
                ) : (
                  <Button
                    type="button"
                    className="h-11"
                    data-testid={`integration-action-${item.id}`}
                    disabled={item.pending}
                    onClick={() => activate(item)}
                  >
                    {item.pending
                      ? "Checking"
                      : item.id === "companycam" && item.action === "Connect"
                        ? "Connect CompanyCam"
                        : item.action}
                  </Button>
                )}
              </div>

              {expanded && item.id === "google-sheets" ? (
                <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3" data-testid="google-sheets-panel">
                  <p className="text-sm text-slate-700">
                    No Google OAuth or account linking needed. Download clean CSV files and open them directly in Google Sheets or Microsoft Excel.
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button type="button" variant="outline" className="h-9 text-xs" onClick={() => downloadCsv("leads")} data-testid="export-csv-leads">
                      Export Leads CSV
                    </Button>
                    <Button type="button" variant="outline" className="h-9 text-xs" onClick={() => downloadCsv("customers")} data-testid="export-csv-customers">
                      Export Customers CSV
                    </Button>
                    <Button type="button" variant="outline" className="h-9 text-xs" onClick={() => downloadCsv("estimates")} data-testid="export-csv-estimates">
                      Export Estimates CSV
                    </Button>
                    <Button type="button" variant="outline" className="h-9 text-xs" onClick={() => downloadCsv("jobs")} data-testid="export-csv-jobs">
                      Export Jobs CSV
                    </Button>
                  </div>
                </div>
              ) : null}

              {expanded && item.id === "lead-form" ? (
                <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3" data-testid="lead-form-panel">
                  <p className="text-sm text-slate-700">
                    Mobile-friendly inquiry form. Embed on your website or share directly. All submissions land in your Sales Pipeline instantly.
                  </p>
                  {leadFormUrl ? (
                    <>
                      <div className="mt-3 grid gap-2">
                        <Label htmlFor="formEmbedCode" className="text-xs">Embed Code (HTML iframe)</Label>
                        <input
                          id="formEmbedCode"
                          readOnly
                          value={embedCode}
                          className="h-9 w-full rounded border border-slate-300 bg-white px-2 font-mono text-xs text-slate-800"
                        />
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Button type="button" variant="outline" className="h-9 text-xs" onClick={() => void copyToClipboard(embedCode, "Embed code")} data-testid="copy-lead-form-embed">
                          Copy Embed Code
                        </Button>
                        <Button type="button" variant="outline" className="h-9 text-xs" onClick={() => void copyToClipboard(leadFormUrl, "Form URL")} data-testid="copy-lead-form-url">
                          Copy Direct URL
                        </Button>
                        <Button type="button" className="h-9 text-xs" nativeButton={false} render={<a href={leadFormUrl} target="_blank" rel="noopener noreferrer" />} data-testid="preview-lead-form">
                          Preview Form
                        </Button>
                      </div>
                    </>
                  ) : (
                    <p className="mt-2 text-xs text-muted-foreground">Preparing your unique lead form link...</p>
                  )}
                </div>
              ) : null}

              {expanded && item.id === "thumbtack" ? (
                <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3" data-testid="thumbtack-panel">
                  <p className="text-sm font-medium text-slate-800">Thumbtack Lead Import</p>
                  <p className="mt-1 text-xs text-slate-600">
                    Route new customer leads from Thumbtack directly into your Scopepipe Sales Pipeline using Zapier:
                  </p>
                  <ol className="mt-2 list-decimal list-inside space-y-1 text-xs text-slate-700">
                    <li>Create a Zap with <strong>Thumbtack</strong> as the Trigger (event: &quot;New Lead&quot;).</li>
                    <li>Add action <strong>Webhooks by Zapier</strong> (event: &quot;POST&quot;).</li>
                    <li>Paste your inbound Scopepipe Webhook URL:</li>
                  </ol>
                  <p className="mt-2 break-all rounded border border-slate-200 bg-white p-2 font-mono text-xs select-all">
                    {inboundUrl || "Configure your lead webhook below."}
                  </p>
                  <Button type="button" variant="outline" className="mt-2 h-9 text-xs" disabled={!inboundUrl} onClick={() => void copyToClipboard(inboundUrl, "Webhook URL")} data-testid="copy-thumbtack-webhook">
                    Copy Webhook URL
                  </Button>
                </div>
              ) : null}

              {expanded && item.id === "angi" ? (
                <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3" data-testid="angi-panel">
                  <p className="text-sm font-medium text-slate-800">Angi Lead Import</p>
                  <p className="mt-1 text-xs text-slate-600">
                    Import homeowner requests from Angi (formerly Angie&apos;s List / HomeAdvisor) automatically:
                  </p>
                  <ol className="mt-2 list-decimal list-inside space-y-1 text-xs text-slate-700">
                    <li>In Zapier, select <strong>Angi Leads</strong> as the Trigger (event: &quot;New Lead&quot;).</li>
                    <li>Choose <strong>Webhooks by Zapier</strong> POST as the action.</li>
                    <li>Set the destination URL to your Scopepipe Webhook address:</li>
                  </ol>
                  <p className="mt-2 break-all rounded border border-slate-200 bg-white p-2 font-mono text-xs select-all">
                    {inboundUrl || "Configure your lead webhook below."}
                  </p>
                  <Button type="button" variant="outline" className="mt-2 h-9 text-xs" disabled={!inboundUrl} onClick={() => void copyToClipboard(inboundUrl, "Webhook URL")} data-testid="copy-angi-webhook">
                    Copy Webhook URL
                  </Button>
                </div>
              ) : null}

              {expanded && item.id === "google-lsa" ? (
                <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3" data-testid="google-lsa-panel">
                  <p className="text-sm font-medium text-slate-800">Google Local Services Ads</p>
                  <p className="mt-1 text-xs text-slate-600">
                    Connect your Google Screened badge and Local Services Ads to receive leads directly in your pipeline:
                  </p>
                  <ol className="mt-2 list-decimal list-inside space-y-1 text-xs text-slate-700">
                    <li>In Zapier, select <strong>Google Local Services Ads</strong> as the Trigger.</li>
                    <li>Choose <strong>Webhooks by Zapier</strong> POST as the action.</li>
                    <li>Set the Webhook URL to:</li>
                  </ol>
                  <p className="mt-2 break-all rounded border border-slate-200 bg-white p-2 font-mono text-xs select-all">
                    {inboundUrl || "Configure your lead webhook below."}
                  </p>
                  <Button type="button" variant="outline" className="mt-2 h-9 text-xs" disabled={!inboundUrl} onClick={() => void copyToClipboard(inboundUrl, "Webhook URL")} data-testid="copy-lsa-webhook">
                    Copy Webhook URL
                  </Button>
                </div>
              ) : null}

              {expanded && item.id === "google-business" ? (
                <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <p className="text-sm text-muted-foreground">This is the same review link as Company settings.</p>
                  <div className="mt-3 grid gap-2">
                    <Label htmlFor="integrationReviewUrl">Review link</Label>
                    <Input
                      id="integrationReviewUrl"
                      value={reviewDraft}
                      className="h-11"
                      placeholder="https://"
                      onValueChange={setReviewDraft}
                      data-testid="integration-review-url"
                    />
                  </div>
                  <Button type="button" className="mt-3 h-11" data-testid="integration-review-save" onClick={saveReview}>
                    Save review link
                  </Button>
                  {reviewDetail ? <p className="mt-2 text-sm">{reviewDetail}</p> : null}
                </div>
              ) : null}

              {expanded && item.id === "facebook-instagram" ? <FacebookSetup /> : null}
            </article>
          )
        })}
      </div>
    </section>
  )
}

function FacebookSetup() {
  const origin = usePageOrigin()
  const address = origin ? `${origin}/api/leads/facebook` : ""
  return (
    <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
      <p className="text-sm text-muted-foreground">
        Facebook Lead Ads and Instagram Lead Ads use this address. Saving a value here does not connect the account. Set FACEBOOK_VERIFY_TOKEN on the host.
      </p>
      <p className="mt-3 break-all font-mono text-sm" data-testid="facebook-webhook-url">
        {address || "Preparing the webhook address."}
      </p>
    </div>
  )
}

function StatusBadge({ status, pending }: { status: FeaturedStatus; pending: boolean }) {
  const label = pending
    ? "Checking"
    : status === "connected"
      ? "Connected"
      : status === "configured"
        ? "Configured"
        : status === "unavailable"
          ? "Setup required"
          : "Not connected"
  return (
    <span
      className={cn(
        "rounded-full border px-2 py-0.5 text-xs font-medium",
        pending && "border-slate-200 bg-slate-50 text-slate-500",
        !pending && status === "connected" && "border-cyan-200 bg-cyan-50 text-cyan-900",
        !pending && status === "configured" && "border-[#004789]/20 bg-[#004789]/5 text-[#004789]",
        !pending && (status === "disconnected" || status === "unavailable") && "border-slate-200 bg-slate-100 text-slate-600",
      )}
    >
      {label}
    </span>
  )
}

function formatSync(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ""
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(date)
}
