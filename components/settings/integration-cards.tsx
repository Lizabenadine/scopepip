"use client"

import { useEffect, useState } from "react"
import { BadgeDollarSign, BookOpen, CalendarDays, Camera, CreditCard, Landmark, Mail, Share2, Store, Wallet, Zap } from "lucide-react"
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
  stripe: CreditCard,
  paypal: Wallet,
  paddle: BadgeDollarSign,
  bank: Landmark,
  "google-calendar": CalendarDays,
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

  const cards = featuredIntegrations(
    {
      reviewUrl: scope.estimateSettings.reviewUrl,
      zapierWebhookUrl: scope.estimateSettings.zapierWebhookUrl,
      companyCamSyncedAt: latestTimestamp(scope.workOrders.map((order) => order.companyCamSyncedAt)),
      quickbooksSyncedAt: latestTimestamp(scope.estimates.map((estimate) => estimate.quickbooksSyncedAt)),
    },
    host,
  )

  useEffect(() => {
    let cancelled = false
    void fetch("/api/integrations/status")
      .then((response) => response.json().then((payload: Partial<HostConnections> & { ok?: boolean }) => ({ response, payload })))
      .then(({ response, payload }) => {
        if (cancelled) return
        if (!response.ok || payload.ok === false) {
          setHost({ companyCam: false, quickbooks: false, googleCalendar: false, facebookLeads: false, stripe: false, paypal: false, paddle: false, bank: false })
          setHostDetail("Connection status could not be checked. Nothing is shown as connected.")
          return
        }
        setHost({
          companyCam: payload.companyCam === true,
          quickbooks: payload.quickbooks === true,
          googleCalendar: payload.googleCalendar === true,
          facebookLeads: payload.facebookLeads === true,
          stripe: payload.stripe === true,
          paypal: payload.paypal === true,
          paddle: payload.paddle === true,
          bank: payload.bank === true,
        })
        setHostDetail("")
      })
      .catch(() => {
        if (cancelled) return
        setHost({ companyCam: false, quickbooks: false, googleCalendar: false, facebookLeads: false, stripe: false, paypal: false, paddle: false, bank: false })
        setHostDetail("Connection status could not be checked. Nothing is shown as connected.")
      })
    return () => {
      cancelled = true
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

  return (
    <section className="flex flex-col gap-3" data-testid="integration-cards">
      <div>
        <h2 className="text-lg font-semibold">Integrations</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          A card stays not connected until that service is actually set up. Webhooks and sending keys stay on this page.
        </p>
        {hostDetail ? <p className="mt-2 text-sm text-destructive">{hostDetail}</p> : null}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {cards.map((item) => {
          const Icon = ICONS[item.id as keyof typeof ICONS]
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
                  <Button type="button" className="h-11" nativeButton={false} render={<a href={item.href} />} data-testid={`integration-action-${item.id}`} disabled={item.pending}>
                    {item.pending ? "Checking" : item.action}
                  </Button>
                ) : (
                  <Button type="button" className="h-11" data-testid={`integration-action-${item.id}`} disabled={item.pending} onClick={() => activate(item)}>
                    {item.pending ? "Checking" : item.action}
                  </Button>
                )}
              </div>
              {expanded && item.id === "google-business" ? (
                <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <p className="text-sm text-muted-foreground">This is the same review link as Company settings.</p>
                  <div className="mt-3 grid gap-2">
                    <Label htmlFor="integrationReviewUrl">Review link</Label>
                    <Input id="integrationReviewUrl" value={reviewDraft} className="h-11" placeholder="https://" onValueChange={setReviewDraft} data-testid="integration-review-url" />
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
  const label = pending ? "Checking" : status === "connected" ? "Connected" : status === "configured" ? "Configured" : status === "unavailable" ? "Setup required" : "Not connected"
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
