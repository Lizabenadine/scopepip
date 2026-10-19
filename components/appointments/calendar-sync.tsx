"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { calendarEvents } from "@/lib/calendar/events"
import { useScope } from "@/lib/data/store"

export function CalendarSync() {
  const scope = useScope()
  const [sending, setSending] = useState(false)
  const [detail, setDetail] = useState("")
  const [subscribe, setSubscribe] = useState("")

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
      setSubscribe(feed ? `https://calendar.google.com/calendar/u/0/r?cid=${encodeURIComponent(feedWebcal)}` : "")
      const google = payload.google?.connected
        ? payload.google.detail || `Updated ${payload.google.synced ?? 0} events in Google Calendar.`
        : "Google Calendar push is not connected. Subscribe to the feed, or set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and GOOGLE_REFRESH_TOKEN."
      setDetail(payload.ok ? `Feed updated with ${payload.count ?? 0} events. ${google}` : "The calendar feed could not be saved.")
    } catch {
      setDetail("The calendar feed could not be saved.")
    } finally {
      setSending(false)
    }
  }

  return (
    <section className="rounded-2xl bg-card p-4 ring-1 ring-foreground/10" data-testid="calendar-sync">
      <h2 className="text-lg font-semibold">Google Calendar</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Visits and scheduled jobs publish to a feed Google Calendar can subscribe to. A saved link is not required.
      </p>
      <Button type="button" className="mt-3 h-11" data-testid="calendar-publish" disabled={sending} onClick={() => void publish()}>
        {sending ? "Updating..." : "Update Google Calendar"}
      </Button>
      {detail ? <p className="mt-2 text-sm">{detail}</p> : null}
      {subscribe ? (
        <a href={subscribe} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block text-sm font-medium text-primary" data-testid="calendar-subscribe">
          Subscribe in Google Calendar
        </a>
      ) : null}
    </section>
  )
}
