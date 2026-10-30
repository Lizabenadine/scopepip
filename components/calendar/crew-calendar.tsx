"use client"

import Link from "next/link"
import { useState } from "react"
import { useClientNow } from "@/lib/browser/client-env"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { useDispatchBoard } from "@/hooks/use-dispatch"
import { useFieldLanguage } from "@/hooks/use-field-language"
import { jobsOnDate, type DispatchJob } from "@/lib/dispatch/board"
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
import { fieldLocale } from "@/lib/field/language"
import type { FieldCopy } from "@/lib/field/copy"
import { cn } from "@/lib/utils"

type CalendarMode = "month" | "week"

export function CrewCalendar() {
  const { ready, jobs, crews } = useDispatchBoard()
  const { copy, language } = useFieldLanguage()
  const locale = fieldLocale(language)
  const [mode, setMode] = useState<CalendarMode>("month")
  const now = useClientNow()
  const [anchor, setAnchor] = useState<Date | null>(null)
  if (now !== null && anchor === null) {
    setAnchor(new Date(now))
  }

  if (!ready || !anchor) {
    return (
      <div className="grid gap-3" aria-hidden>
        <div className="h-11 animate-pulse rounded-lg bg-muted" />
        <div className="h-80 animate-pulse rounded-2xl bg-muted" />
      </div>
    )
  }

  const today = isoDate(new Date())
  const days = mode === "month" ? monthGrid(anchor).map((day) => day.iso) : weekDays(anchor)
  const lastVisible = days[days.length - 1] ?? ""
  const nextJob = jobs
    .filter(
      (job) =>
        job.status !== "unscheduled" &&
        job.scheduledStartDate &&
        job.scheduledStartDate > lastVisible,
    )
    .sort((a, b) => (a.scheduledStartDate ?? "").localeCompare(b.scheduledStartDate ?? ""))[0]

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{copy.calendarTitle}</h1>
          <p className="text-sm text-muted-foreground">{monthLabel(anchor, locale)}</p>
        </div>
        <Link href="/dispatch" className="text-sm font-medium text-primary">
          {copy.dispatchBoard}
        </Link>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex rounded-lg bg-muted p-1" role="tablist" aria-label={copy.rangeLabel}>
          <ModeButton active={mode === "week"} label={copy.week} onClick={() => setMode("week")} />
          <ModeButton active={mode === "month"} label={copy.month} onClick={() => setMode("month")} />
        </div>
        <button
          type="button"
          className="inline-flex size-11 items-center justify-center rounded-lg hover:bg-muted"
          aria-label={copy.previous}
          onClick={() => setAnchor(mode === "month" ? shiftMonth(anchor, -1) : shiftWeek(anchor, -1))}
        >
          <ChevronLeft className="size-5" />
        </button>
        <button
          type="button"
          className="h-11 rounded-lg px-3 text-sm font-medium hover:bg-muted"
          onClick={() => setAnchor(new Date())}
        >
          {copy.today}
        </button>
        <button
          type="button"
          className="inline-flex size-11 items-center justify-center rounded-lg hover:bg-muted"
          aria-label={copy.next}
          onClick={() => setAnchor(mode === "month" ? shiftMonth(anchor, 1) : shiftWeek(anchor, 1))}
        >
          <ChevronRight className="size-5" />
        </button>
      </div>

      <ul className="flex flex-wrap gap-2" aria-label={copy.crewColors}>
        {crews.map((crew) => (
          <li
            key={crew.id}
            className="inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-xs font-medium"
            style={{ backgroundColor: crew.color }}
          >
            {crew.name}
          </li>
        ))}
      </ul>

      {nextJob?.scheduledStartDate ? (
        <button
          type="button"
          className="rounded-xl bg-card px-3 py-2 text-left text-sm border border-slate-200 bg-white shadow-sm"
          onClick={() => setAnchor(parseIsoDate(nextJob.scheduledStartDate!))}
        >
          {copy.nextJob}: {nextJob.clientName} · {copy.jobDate(nextJob.scheduledStartDate)}
          {nextJob.crewName ? ` · ${nextJob.crewName}` : ""}
        </button>
      ) : null}

      {mode === "week" ? (
        <WeekGrid days={weekDays(anchor)} jobs={jobs} today={today} locale={locale} />
      ) : (
        <MonthGrid anchor={anchor} jobs={jobs} today={today} copy={copy} locale={locale} />
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
  jobs,
  today,
  locale,
}: {
  days: string[]
  jobs: DispatchJob[]
  today: string
  locale: string
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
            {weekdayLabel(iso, locale)} {dayNumber(iso)}
          </h2>
          <div className="mt-2 flex flex-col gap-2">
            {jobsOnDate(jobs, iso).map((job) => (
              <JobBlock key={job.estimateId} job={job} />
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}

function MonthGrid({
  anchor,
  jobs,
  today,
  copy,
  locale,
}: {
  anchor: Date
  jobs: DispatchJob[]
  today: string
  copy: FieldCopy
  locale: string
}) {
  const cells = monthGrid(anchor)
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="hidden grid-cols-7 bg-muted sm:grid">
        {weekDays(anchor).map((iso) => (
          <div key={iso} className="px-2 py-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            {weekdayLabel(iso, locale)}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-7">
        {cells.map((cell) => {
          const dayJobs = jobsOnDate(jobs, cell.iso)
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
                <span className="sm:hidden">{weekdayLabel(cell.iso, locale)} </span>
                {dayNumber(cell.iso)}
              </h2>
              <div className="mt-1 flex flex-col gap-1">
                {dayJobs.slice(0, 3).map((job) => (
                  <JobBlock key={job.estimateId} job={job} />
                ))}
                {dayJobs.length > 3 ? (
                  <p className="text-xs text-muted-foreground">{copy.more(dayJobs.length - 3)}</p>
                ) : null}
              </div>
            </section>
          )
        })}
      </div>
    </div>
  )
}

function JobBlock({ job }: { job: DispatchJob }) {
  const href = `/work-orders/${job.estimateId}`
  return (
    <Link
      href={href}
      data-job-id={job.estimateId}
      className="block rounded-lg px-2 py-1 text-left text-xs font-medium text-foreground"
      style={{ backgroundColor: job.crewColor ?? "#efe9dc" }}
    >
      <span className="block truncate">{job.clientName}</span>
      <span className="block truncate font-normal">{job.address}</span>
      {job.crewName ? <span className="block truncate font-normal">{job.crewName}</span> : null}
    </Link>
  )
}
