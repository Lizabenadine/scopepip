"use client"

import { useEffect, useMemo, useState } from "react"
import { appointmentLabel } from "@/lib/appointments/visit"
import { bookingDayLabel, bookingDays, bookingTimeLabel, BOOKING_TIMES } from "@/lib/bookings/slots"
import { displayCompanyName } from "@/lib/brand/company"
import { Button } from "@/components/ui/button"

export function BookingPage({ token }: { token: string }) {
  const [companyName, setCompanyName] = useState("")
  const [clientName, setClientName] = useState("")
  const [jobAddress, setJobAddress] = useState("")
  const [missing, setMissing] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const days = useMemo(() => bookingDays(new Date()), [])
  const [visitDay, setVisitDay] = useState(days[0] ?? "")
  const [visitTime, setVisitTime] = useState<(typeof BOOKING_TIMES)[number] | "">("")
  const [error, setError] = useState<string | null>(null)
  const [sending, setSending] = useState(false)
  const [booked, setBooked] = useState<{ visitDay: string; visitTime: string } | null>(null)
  const company = displayCompanyName(companyName)

  useEffect(() => {
    let cancelled = false
    void fetch(`/api/public/bookings/${encodeURIComponent(token)}`)
      .then(async (response) => {
        if (!response.ok) {
          if (!cancelled) {
            setMissing(true)
            setLoaded(true)
          }
          return
        }
        const payload = (await response.json()) as { companyName?: string; clientName?: string; jobAddress?: string }
        if (cancelled) return
        setCompanyName(payload.companyName ?? "")
        setClientName(payload.clientName ?? "")
        setJobAddress(payload.jobAddress ?? "")
        setLoaded(true)
      })
      .catch(() => {
        if (!cancelled) {
          setMissing(true)
          setLoaded(true)
        }
      })
    return () => {
      cancelled = true
    }
  }, [token])

  async function submit() {
    if (!visitDay || !visitTime) {
      setError("Choose a day and a start time.")
      return
    }
    setSending(true)
    setError(null)
    try {
      const response = await fetch("/api/bookings", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token, visitDay, visitTime }),
      })
      const result = (await response.json()) as { ok?: boolean; reason?: string; visitDay?: string; visitTime?: string }
      if (!response.ok || !result.ok || !result.visitDay || !result.visitTime) {
        setError(result.reason || "That time could not be booked.")
        return
      }
      setBooked({ visitDay: result.visitDay, visitTime: result.visitTime })
    } catch {
      setError("That time could not be booked.")
    } finally {
      setSending(false)
    }
  }

  if (!loaded) return <div className="h-40 animate-pulse rounded-2xl bg-muted" aria-hidden />

  if (missing) {
    return (
      <div className="rounded-2xl border border-dashed border-border px-4 py-12 text-center">
        <h1 className="text-xl font-semibold">This booking link is not valid</h1>
        <p className="mt-2 text-sm text-muted-foreground">Ask your painter for a new link.</p>
      </div>
    )
  }

  if (booked) {
    return (
      <div className="mx-auto grid max-w-lg gap-3 rounded-2xl bg-card p-6 ring-1 ring-foreground/10" data-testid="book-success">
        <h1 className="text-2xl font-semibold tracking-tight">You are booked</h1>
        <p className="text-sm text-muted-foreground">
          {company} will walk {jobAddress || "the job"} on{" "}
          {appointmentLabel(booked.visitDay, localInstant(booked.visitDay, booked.visitTime))}.
        </p>
      </div>
    )
  }

  return (
    <div className="mx-auto grid max-w-lg gap-5" data-testid="booking-page">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Pick an estimate time</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {clientName ? `${clientName} · ` : ""}
          {jobAddress || "Choose a time for the walkthrough."} {company} will come measure and send a price.
        </p>
      </div>
      <div className="grid gap-2">
        <p className="text-sm font-medium">Day</p>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {days.map((day) => (
            <button
              key={day}
              type="button"
              data-testid={`book-day-${day}`}
              onClick={() => setVisitDay(day)}
              className={
                visitDay === day
                  ? "shrink-0 rounded-full bg-primary px-3 py-2 text-sm font-medium text-primary-foreground"
                  : "shrink-0 rounded-full bg-muted px-3 py-2 text-sm font-medium"
              }
            >
              {bookingDayLabel(day)}
            </button>
          ))}
        </div>
      </div>
      <div className="grid gap-2">
        <p className="text-sm font-medium">Start time</p>
        <div className="grid grid-cols-2 gap-2">
          {BOOKING_TIMES.map((time) => (
            <button
              key={time}
              type="button"
              data-testid={`book-time-${time}`}
              onClick={() => setVisitTime(time)}
              className={
                visitTime === time
                  ? "h-11 rounded-xl bg-primary text-sm font-medium text-primary-foreground"
                  : "h-11 rounded-xl bg-muted text-sm font-medium"
              }
            >
              {bookingTimeLabel(time)}
            </button>
          ))}
        </div>
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <Button type="button" className="h-11" disabled={sending} data-testid="book-submit" onClick={() => void submit()}>
        {sending ? "Booking..." : "Book this time"}
      </Button>
    </div>
  )
}

function localInstant(visitDay: string, visitTime: string): string {
  const [year, month, day] = visitDay.split("-").map(Number)
  const [hours, minutes] = visitTime.split(":").map(Number)
  return new Date(year, (month ?? 1) - 1, day ?? 1, hours ?? 0, minutes ?? 0, 0, 0).toISOString()
}
