"use client"

import Link from "next/link"
import { useState, useSyncExternalStore } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { appointmentsOnDay, listSalesAppointments, type SalesAppointment } from "@/lib/appointments/calendar"
import { visitTimeLabel } from "@/lib/appointments/visit"
import {
  dayNumber,
  isoDate,
  monthGrid,
  monthLabel,
  parseIsoDate,
  shiftMonth,
  shiftWeek,
  weekDays,
  weekdayLabel,
} from "@/lib/dispatch/calendar"
import { jobDate } from "@/lib/format"
import { useFieldLanguage } from "@/hooks/use-field-language"
import { fieldLocale } from "@/lib/field/language"
import { useScope } from "@/lib/data/store"
import { officeLabel } from "@/lib/office/dashboard-copy"
import { cn } from "@/lib/utils"

type CalendarMode = "month" | "week"

let mountedToday: Date | null = null

function clientToday(): Date {
  mountedToday ??= new Date()
  return mountedToday
}

function emptySubscribe() {
  return () => {}
}

function serverToday(): null {
  return null
}

export function AppointmentsCalendar() {
  const { ready, estimates, clients, workOrders } = useScope()
  const { language } = useFieldLanguage()
  const say = (text: string) => officeLabel(text, language)
  const [mode, setMode] = useState<CalendarMode>("month")
  const [anchor, setAnchor] = useState<Date | null>(null)
  const todayDate = useSyncExternalStore(emptySubscribe, clientToday, serverToday)
  const current = anchor ?? todayDate

  if (!ready || !current) {
    return (
      <div className="grid gap-3" aria-hidden>
        <div className="h-11 animate-pulse rounded-lg bg-muted" />
        <div className="h-80 animate-pulse rounded-2xl bg-muted" />
      </div>
    )
  }

  const appointments = listSalesAppointments(estimates, clients, workOrders)
  const today = isoDate(todayDate ?? current)
  const days = mode === "month" ? monthGrid(current).map((day) => day.iso) : weekDays(current)
  const lastVisible = days[days.length - 1] ?? ""
  const nextAppointment = appointments
    .filter((appointment) => appointment.visitDay > lastVisible)
    .sort((left, right) => left.visitDay.localeCompare(right.visitDay))[0]

  return (
    <div className="flex flex-col gap-4" data-testid="appointments-calendar">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{say("Appointments")}</h1>
          <p className="text-sm text-muted-foreground">
            {monthLabel(current, fieldLocale(language))}
            {appointments.length === 0 ? "" : language === "es" ? ` · ${appointments.length} citas` : ` · ${appointments.length} booked`}
          </p>
        </div>
        <Link href="/sales-pipeline" className="text-sm font-medium text-primary">
          {say("Sales Pipeline")}
        </Link>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex rounded-lg bg-muted p-1" role="tablist" aria-label="Calendar range">
          <ModeButton active={mode === "week"} label="Week" onClick={() => setMode("week")} />
          <ModeButton active={mode === "month"} label="Month" onClick={() => setMode("month")} />
        </div>
        <button
          type="button"
          className="inline-flex size-11 items-center justify-center rounded-lg hover:bg-muted"
          aria-label="Previous"
          onClick={() => setAnchor(mode === "month" ? shiftMonth(current, -1) : shiftWeek(current, -1))}
        >
          <ChevronLeft className="size-5" />
        </button>
        <button
          type="button"
          className="h-11 rounded-lg px-3 text-sm font-medium hover:bg-muted"
          onClick={() => setAnchor(new Date())}
        >
          Today
        </button>
        <button
          type="button"
          className="inline-flex size-11 items-center justify-center rounded-lg hover:bg-muted"
          aria-label="Next"
          onClick={() => setAnchor(mode === "month" ? shiftMonth(current, 1) : shiftWeek(current, 1))}
        >
          <ChevronRight className="size-5" />
        </button>
      </div>

      {nextAppointment ? (
        <button
          type="button"
          className="rounded-xl bg-card px-3 py-2 text-left text-sm border border-slate-200 bg-white shadow-sm"
          onClick={() => setAnchor(parseIsoDate(nextAppointment.visitDay))}
        >
          Next: {nextAppointment.clientName} · {jobDate(nextAppointment.visitDay)}
          {visitTimeLabel(nextAppointment.visitStartInstant) ? ` · ${visitTimeLabel(nextAppointment.visitStartInstant)}` : ""}
        </button>
      ) : null}

      {appointments.length === 0 ? (
        <p
          data-testid="appointments-empty"
          className="rounded-2xl border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground"
        >
          No visits or scheduled jobs yet. Book a visit from the sales pipeline, or put a day on a job.
        </p>
      ) : null}
      {mode === "week" ? (
        <WeekGrid days={weekDays(current)} appointments={appointments} today={today} />
      ) : (
        <MonthGrid anchor={current} appointments={appointments} today={today} />
      )}
    </div>
  )
}

function ModeButton({
  active,
  label,
  onClick,
}: {
  active: boolean
  label: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        "h-9 rounded-md px-3 text-sm font-medium",
        active ? "bg-background text-foreground shadow-sm" : "text-muted-foreground",
      )}
    >
      {label}
    </button>
  )
}

function WeekGrid({
  days,
  appointments,
  today,
}: {
  days: string[]
  appointments: SalesAppointment[]
  today: string
}) {
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-7">
      {days.map((iso) => (
        <section
          key={iso}
          data-date={iso}
          className={cn(
            "min-w-0 rounded-2xl bg-card p-2 border border-slate-200 bg-white shadow-sm",
            iso === today && "ring-primary",
          )}
        >
          <h2 className="px-1 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            {weekdayLabel(iso)} {dayNumber(iso)}
          </h2>
          <div className="mt-2 flex flex-col gap-2">
            {appointmentsOnDay(appointments, iso).map((appointment) => (
              <AppointmentBlock key={appointment.estimateId} appointment={appointment} />
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}

function MonthGrid({
  anchor,
  appointments,
  today,
}: {
  anchor: Date
  appointments: SalesAppointment[]
  today: string
}) {
  const cells = monthGrid(anchor)
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="hidden grid-cols-7 bg-muted sm:grid">
        {weekDays(anchor).map((iso) => (
          <div key={iso} className="px-2 py-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            {weekdayLabel(iso)}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-7">
        {cells.map((cell) => {
          const dayAppointments = appointmentsOnDay(appointments, cell.iso)
          return (
            <section
              key={cell.iso}
              data-date={cell.iso}
              className={cn(
                "min-h-24 border-t border-border p-2 sm:min-h-28",
                !cell.inMonth && "bg-muted/50 text-muted-foreground",
                cell.iso === today && "ring-2 ring-inset ring-primary",
              )}
            >
              <h2 className="text-xs font-semibold">
                <span className="sm:hidden">{weekdayLabel(cell.iso)} </span>
                {dayNumber(cell.iso)}
              </h2>
              <div className="mt-1 flex flex-col gap-1">
                {dayAppointments.slice(0, 3).map((appointment) => (
                  <AppointmentBlock key={appointment.estimateId} appointment={appointment} />
                ))}
                {dayAppointments.length > 3 ? (
                  <p className="text-xs text-muted-foreground">+{dayAppointments.length - 3} more</p>
                ) : null}
              </div>
            </section>
          )
        })}
      </div>
    </div>
  )
}

function AppointmentBlock({ appointment }: { appointment: SalesAppointment }) {
  const time = visitTimeLabel(appointment.visitStartInstant)
  const kind = appointment.kind === "job" ? "Job" : "Visit"
  return (
    <Link
      href={appointment.kind === "job" ? `/work-orders/${appointment.estimateId}` : `/estimates/${appointment.estimateId}`}
      data-testid={`appointment-${appointment.kind}-${appointment.estimateId}`}
      className={cn(
        "block rounded-lg px-2 py-1 text-left text-xs font-medium text-foreground",
        appointment.kind === "job" ? "bg-cyan-50" : "bg-[#efe9dc]",
      )}
    >
      <span className="block truncate">
        {kind}
        {time ? ` · ${time}` : ""}
        {" · "}
        {appointment.clientName}
      </span>
      {appointment.jobAddress ? <span className="block truncate font-normal">{appointment.jobAddress}</span> : null}
      {appointment.salesperson ? <span className="block truncate font-normal">{appointment.salesperson}</span> : null}
    </Link>
  )
}
