"use client"

import { useEffect, useRef } from "react"
import { useScope } from "@/lib/data/store"
import { isBookingTime, type PublicBooking } from "@/lib/bookings/apply"
import type { InboundLead } from "@/lib/leads/types"
import type { ProposalEngagementEvent } from "@/lib/proposals/engagement"
import { LEAD_SOURCES } from "@/lib/types"
import { calendarEvents } from "@/lib/calendar/events"
import { companyCamJobs } from "@/lib/companycam/match"
import { pendingZapierEvents } from "@/lib/zapier/events"

const TICK_MS = 20_000

export function FollowUpRunner() {
  const scope = useScope()
  const scopeRef = useRef(scope)
  scopeRef.current = scope

  useEffect(() => {
    let stopped = false

    async function pullInbound() {
      const response = await fetch("/api/messages/inbound")
      if (!response.ok) return
      const payload = (await response.json()) as { messages?: Array<Record<string, unknown>> }
      const messages = Array.isArray(payload.messages) ? payload.messages : []
      const ids: string[] = []
      for (const message of messages) {
        if (stopped || typeof message.id !== "string") continue
        scopeRef.current.receiveInbound({
          id: message.id,
          from: typeof message.from === "string" ? message.from : "",
          body: typeof message.body === "string" ? message.body : "",
          mediaUrls: Array.isArray(message.mediaUrls)
            ? message.mediaUrls.filter((url): url is string => typeof url === "string")
            : [],
          createdAt: typeof message.createdAt === "string" ? message.createdAt : new Date().toISOString(),
        })
        ids.push(message.id)
      }
      if (ids.length > 0) {
        await fetch("/api/messages/ack", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ ids }),
        })
      }
    }

    async function pullLeads() {
      const response = await fetch("/api/leads/inbound")
      if (!response.ok) return
      const payload = (await response.json()) as { leads?: InboundLead[] }
      const leads = Array.isArray(payload.leads) ? payload.leads : []
      const ids: string[] = []
      for (const lead of leads) {
        if (stopped || !lead || typeof lead.id !== "string" || typeof lead.name !== "string") continue
        if (!LEAD_SOURCES.some((source) => source === lead.source)) continue
        scopeRef.current.receiveInboundLead({
          id: lead.id,
          source: lead.source,
          name: lead.name,
          phone: typeof lead.phone === "string" ? lead.phone : "",
          email: typeof lead.email === "string" ? lead.email : "",
          address: typeof lead.address === "string" ? lead.address : "",
          message: typeof lead.message === "string" ? lead.message : "",
          createdAt: typeof lead.createdAt === "string" ? lead.createdAt : new Date().toISOString(),
        })
        ids.push(lead.id)
      }
      if (ids.length > 0) {
        await fetch("/api/leads/ack", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ ids }),
        })
      }
    }

    async function pullBookings() {
      const response = await fetch("/api/bookings")
      if (!response.ok) return
      const payload = (await response.json()) as { bookings?: PublicBooking[] }
      const bookings = Array.isArray(payload.bookings) ? payload.bookings : []
      const ids: string[] = []
      for (const booking of bookings) {
        if (stopped || !booking || typeof booking.token !== "string" || typeof booking.id !== "string") continue
        if (!isBookingTime(booking.visitTime) || typeof booking.visitDay !== "string") continue
        scopeRef.current.receivePublicBooking({
          id: booking.id,
          token: booking.token,
          visitDay: booking.visitDay,
          visitTime: booking.visitTime,
          createdAt: typeof booking.createdAt === "string" ? booking.createdAt : new Date().toISOString(),
        })
        ids.push(booking.id)
      }
      if (ids.length > 0) {
        await fetch("/api/bookings/ack", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ ids }),
        })
      }
    }

    async function pullProposalOpens() {
      const response = await fetch("/api/proposals/events")
      if (!response.ok) return
      const payload = (await response.json()) as { events?: Array<ProposalEngagementEvent & { id?: string }> }
      const events = Array.isArray(payload.events) ? payload.events : []
      const ids: string[] = []
      for (const event of events) {
        if (stopped || !event || typeof event.id !== "string" || typeof event.proposalId !== "string") continue
        if (event.eventType !== "open" && event.eventType !== "revisit" && event.eventType !== "view_section") continue
        scopeRef.current.receiveProposalEvent({
          proposalId: event.proposalId,
          eventType: event.eventType,
          sectionName: typeof event.sectionName === "string" ? event.sectionName : null,
          timestamp: typeof event.timestamp === "string" ? event.timestamp : new Date().toISOString(),
          userAgent: typeof event.userAgent === "string" ? event.userAgent : "unknown",
        })
        ids.push(event.id)
      }
      if (ids.length > 0) {
        await fetch("/api/proposals/events/ack", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ ids }),
        })
      }
    }

    async function tick() {
      const api = scopeRef.current
      try {
        await pullInbound()
      } catch {
        // A missed inbound text retries on the next tick. Sequences still send.
      }
      try {
        await pullLeads()
      } catch {
        // A missed lead retries on the next tick.
      }
      try {
        await pullBookings()
      } catch {
        // A missed booking retries on the next tick.
      }
      try {
        await pullProposalOpens()
      } catch {
        // A missed proposal open retries on the next tick.
      }
      if (stopped) return
      api.prepareFollowUps()
      try {
        await fetch("/api/follow-ups/drip", { method: "POST" })
      } catch {
        // The follow-up drip retries on the next tick.
      }
      await pushIntegrations()
    }

    async function pushIntegrations() {
      const api = scopeRef.current
      try {
        const response = await fetch("/api/calendar/publish", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ token: api.estimateSettings.calendarFeedToken, events: calendarEvents(api) }),
        })
        const payload = (await response.json()) as {
          token?: string
          google?: { events?: { uid: string; googleEventId: string }[] }
        }
        if (stopped) return
        if (payload.token && payload.token !== scopeRef.current.estimateSettings.calendarFeedToken) {
          scopeRef.current.updateEstimateSettings({ ...scopeRef.current.estimateSettings, calendarFeedToken: payload.token })
        }
        if (payload.google?.events && payload.google.events.length > 0) scopeRef.current.applyGoogleEvents(payload.google.events)
      } catch {
        // The feed retries on the next tick.
      }
      try {
        const current = scopeRef.current
        const events = pendingZapierEvents(current)
        if (events.length > 0 && current.estimateSettings.zapierWebhookUrl) {
          const response = await fetch("/api/zapier/dispatch", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ url: current.estimateSettings.zapierWebhookUrl, events }),
          })
          const payload = (await response.json()) as { results?: { id: string; delivery: string }[] }
          const sent = (payload.results ?? []).filter((item) => item.delivery === "sent").map((item) => item.id)
          if (sent.length > 0) scopeRef.current.markZapierDelivered(sent)
        }
      } catch {
        // A missed Zapier post retries on the next tick.
      }
      try {
        const jobs = companyCamJobs(scopeRef.current)
        if (jobs.length === 0) return
        const response = await fetch("/api/companycam/sync", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ jobs }),
        })
        const payload = (await response.json()) as {
          connected?: boolean
          jobs?: { estimateId: string; matched?: boolean; projectId?: string; projectUrl?: string; photos?: { id: string; url: string; capturedAt: string }[] }[]
        }
        if (!payload.connected || stopped) return
        const syncedAt = new Date().toISOString()
        const rows = (payload.jobs ?? [])
          .filter((job) => job.matched && job.projectId)
          .map((job) => ({
            estimateId: job.estimateId,
            projectId: job.projectId!,
            projectUrl: job.projectUrl || "",
            syncedAt,
            photos: job.photos ?? [],
          }))
        if (rows.length > 0) scopeRef.current.applyCompanyCam(rows)
      } catch {
        // A missed CompanyCam pull retries on the next tick.
      }
    }

    void tick()
    const timer = window.setInterval(() => {
      void tick()
    }, TICK_MS)
    return () => {
      stopped = true
      window.clearInterval(timer)
    }
  }, [])

  return null
}
