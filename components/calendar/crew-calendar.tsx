"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { useDispatchBoard } from "@/hooks/use-dispatch"
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
import { jobDate } from "@/lib/format"
import { cn } from "@/lib/utils"

type CalendarMode = "month" | "week"

export function CrewCalendar() {
  const { ready, jobs, crews } = useDispatchBoard()
  const [mode, setMode] = useState<CalendarMode>("month")
  const [anchor, setAnchor] = useState<Date | null>(null)

  useEffect(() => {
    setAnchor(new Date())
  }, [])

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
  const visible = new Set(days)
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
          <h1 className="text-2xl font-semibold tracking-tight">Calendar</h1>
          <p className="text-sm text-muted-foreground">{monthLabel(anchor)}</p>
        </div>
        <Link href="/dispatch" className="text-sm font-medium text-primary">
          Dispatch board
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
          onClick={() => setAnchor(mode === "month" ? shiftMonth(anchor, -1) : shiftWeek(anchor, -1))}
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
          onClick={() => setAnchor(mode === "month" ? shiftMonth(anchor, 1) : shiftWeek(anchor, 1))}
        >
          <ChevronRight className="size-5" />
        </button>
      </div>

      <ul className="flex flex-wrap gap-2" aria-label="Crew colors">
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
          className="rounded-xl bg-card px-3 py-2 text-left text-sm ring-1 ring-foreground/10"
          onClick={() => setAnchor(parseIsoDate(nextJob.scheduledStartDate!))}
        >
          Next: {nextJob.clientName} · {jobDate(nextJob.scheduledStartDate)}
          {nextJob.crewName ? ` · ${nextJob.crewName}` : ""}
        </button>
      ) : null}

      {mode === "week" ? (
        <WeekGrid days={weekDays(anchor)} jobs={jobs} today={today} />
      ) : (
        <MonthGrid anchor={anchor} jobs={jobs} today={today} />
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

function WeekGrid({ days, jobs, today }: { days: string[]; jobs: DispatchJob[]; today: string }) {
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-7">
      {days.map((iso) => (
        <section
          key={iso}
          data-date={iso}
          className={cn(
            "min-w-0 rounded-2xl bg-card p-2 ring-1 ring-foreground/10",
            iso === today && "ring-primary",
          )}
        >
          <h2 className="px-1 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            {weekdayLabel(iso)} {dayNumber(iso)}
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

function MonthGrid({ anchor, jobs, today }: { anchor: Date; jobs: DispatchJob[]; today: string }) {
  const cells = monthGrid(anchor)
  return (
    <div className="overflow-hidden rounded-2xl ring-1 ring-foreground/10">
      <div className="hidden grid-cols-7 bg-muted sm:grid">
        {weekDays(anchor).map((iso) => (
          <div key={iso} className="px-2 py-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            {weekdayLabel(iso)}
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
                <span className="sm:hidden">{weekdayLabel(cell.iso)} </span>
                {dayNumber(cell.iso)}
              </h2>
              <div className="mt-1 flex flex-col gap-1">
                {dayJobs.slice(0, 3).map((job) => (
                  <JobBlock key={job.estimateId} job={job} />
                ))}
                {dayJobs.length > 3 ? (
                  <p className="text-xs text-muted-foreground">+{dayJobs.length - 3} more</p>
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
