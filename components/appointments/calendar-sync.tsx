"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { calendarEvents } from "@/lib/calendar/events"
import { useScope } from "@/lib/data/store"

export function CalendarSync() {
  const scope = useScope()
  const [sending, setSending] = useState(false)
  const [detail, setDetail] = useState("")
  const [googleSubscribe, setGoogleSubscribe] = useState("")
  const [outlookSubscribe, setOutlookSubscribe] = useState("")
  const [feedUrl, setFeedUrl] = useState("")
  const [copied, setCopied] = useState(false)

  async function publish() {
    if (sending) return
    setSending(true)
    setDetail("")
    try {
      const response = await fetch("/api/calendar/publish", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          token: scope.estimateSettings.calendarFeedToken,
          events: calendarEvents(scope),
        }),
      })
      const payload = (await response.json()) as {
        ok?: boolean
        token?: string
        count?: number
        feedPath?: string
        google?: { connected?: boolean; synced?: number; detail?: string; events?: { uid: string; googleEventId: string }[] }
      }
      if (payload.token && payload.token !== scope.estimateSettings.calendarFeedToken) {
        scope.updateEstimateSettings({ ...scope.estimateSettings, calendarFeedToken: payload.token })
      }
      if (payload.google?.events && payload.google.events.length > 0) scope.applyGoogleEvents(payload.google.events)
      const feed = payload.feedPath ? new URL(payload.feedPath, window.location.origin).toString() : ""
      const feedWebcal = feed.replace(/^https?:/, "webcal:")
      setFeedUrl(feedWebcal)
      setGoogleSubscribe(feed ? `https://calendar.google.com/calendar/u/0/r?cid=${encodeURIComponent(feedWebcal)}` : "")
      setOutlookSubscribe(
        feed ? `https://outlook.live.com/calendar/0/addcalendar?url=${encodeURIComponent(feedWebcal)}` : "",
      )
      const google = payload.google?.connected
        ? payload.google.detail || `Updated ${payload.google.synced ?? 0} events on the calendar.`
        : "Direct Google push is not configured. Use the Google or Outlook subscribe links below."
      setDetail(payload.ok ? `Feed updated with ${payload.count ?? 0} events. ${google}` : "The calendar feed could not be saved.")
    } catch {
      setDetail("The calendar feed could not be saved.")
    } finally {
      setSending(false)
    }
  }

  async function copyFeed() {
    if (!feedUrl) return
    try {
      await navigator.clipboard.writeText(feedUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    } catch {
      // fallback
    }
  }

  return (
    <section className="rounded-2xl bg-card p-4 border border-slate-200 bg-white shadow-sm" data-testid="calendar-sync">
      <h2 className="text-lg font-semibold">Calendar</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Visits and scheduled jobs publish to an iCal feed. Subscribe using Google Calendar, Outlook, or Apple Calendar.
      </p>
      <Button type="button" className="mt-3 h-11" data-testid="calendar-publish" disabled={sending} onClick={() => void publish()}>
        {sending ? "Updating..." : "Update calendar"}
      </Button>
      {detail ? <p className="mt-2 text-sm">{detail}</p> : null}
      {googleSubscribe || outlookSubscribe ? (
        <div className="mt-4 flex flex-col gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Subscribe to Live Feed</p>
          <div className="flex flex-wrap gap-2 mt-1">
            {googleSubscribe ? (
              <a
                href={googleSubscribe}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-9 items-center justify-center rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-800 shadow-sm hover:bg-slate-50"
                data-testid="calendar-subscribe"
              >
                Subscribe in Google Calendar
              </a>
            ) : null}
            {outlookSubscribe ? (
              <a
                href={outlookSubscribe}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-9 items-center justify-center rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-800 shadow-sm hover:bg-slate-50"
                data-testid="calendar-subscribe-outlook"
              >
                Subscribe in Outlook
              </a>
            ) : null}
            {feedUrl ? (
              <button
                type="button"
                onClick={() => void copyFeed()}
                className="inline-flex h-9 items-center justify-center rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-800 shadow-sm hover:bg-slate-50"
                data-testid="calendar-feed-copy"
              >
                {copied ? "Feed Link Copied!" : "Copy iCal/Webcal Link"}
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
    </section>
  )
}
