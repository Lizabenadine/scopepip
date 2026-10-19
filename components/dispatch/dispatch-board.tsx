"use client"

import Link from "next/link"
import { useState } from "react"
import { CalendarDays, GripVertical } from "lucide-react"
import { PhotoGallery } from "@/components/photos/photo-gallery"
import { useDispatchBoard } from "@/hooks/use-dispatch"
import {
  fieldsForCrew,
  fieldsForDate,
  fieldsForStatus,
} from "@/lib/dispatch/assign"
import type { DispatchJob } from "@/lib/dispatch/board"
import { isoDate } from "@/lib/dispatch/calendar"
import { hoursLabel, jobDate } from "@/lib/format"
import type { CrewLead, DispatchStatus } from "@/lib/types"
import { cn } from "@/lib/utils"

const COLUMNS: { status: DispatchStatus; label: string; empty: string }[] = [
  {
    status: "unscheduled",
    label: "Unscheduled",
    empty: "Accepted jobs land here until a crew and a day are set.",
  },
  {
    status: "scheduled",
    label: "Scheduled",
    empty: "Drop a job to put it on the calendar.",
  },
  {
    status: "in_progress",
    label: "In Progress",
    empty: "Drop a job when the crew is on site.",
  },
  {
    status: "complete",
    label: "Complete",
    empty: "Finished jobs stay here.",
  },
]

export function DispatchBoard() {
  const { ready, crews, jobs, assign } = useDispatchBoard()
  const [over, setOver] = useState<string | null>(null)
  const [dragging, setDragging] = useState<string | null>(null)

  if (!ready) {
    return (
      <div className="grid gap-3" aria-hidden>
        <div className="h-11 animate-pulse rounded-lg bg-muted" />
        <div className="h-48 animate-pulse rounded-2xl bg-muted" />
      </div>
    )
  }

  const currentOf = (job: DispatchJob) => ({
    status: job.status,
    assignedCrewId: job.crewId,
    scheduledStartDate: job.scheduledStartDate,
  })

  const moveTo = (job: DispatchJob, status: DispatchStatus) => {
    assign(job.estimateId, fieldsForStatus(currentOf(job), job.estimateScheduledOn, status, isoDate(new Date())))
  }

  const dropOn = (estimateId: string, status: DispatchStatus) => {
    const job = jobs.find((item) => item.estimateId === estimateId)
    setDragging(null)
    if (!job || job.status === status) return
    moveTo(job, status)
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dispatch</h1>
          <p className="text-sm text-muted-foreground">
            {jobs.length} accepted {jobs.length === 1 ? "job" : "jobs"}. Drag a card or pick a crew lead.
          </p>
        </div>
        <Link
          href="/calendar"
          className="inline-flex h-11 items-center gap-2 rounded-lg px-3 text-sm font-medium text-primary hover:bg-muted"
        >
          <CalendarDays className="size-4" />
          Calendar
        </Link>
      </div>

      <ul className="flex gap-2 overflow-x-auto pb-1" aria-label="Crew leads">
        {crews.map((crew) => (
          <li key={crew.id}>
            <div
              data-crew-id={crew.id}
              onDragOver={(event) => {
                event.preventDefault()
                setOver(crew.id)
              }}
              onDragLeave={() => setOver((current) => (current === crew.id ? null : current))}
              onDrop={(event) => {
                event.preventDefault()
                setOver(null)
                const estimateId = event.dataTransfer.getData("text/plain") || dragging
                const job = estimateId ? jobs.find((item) => item.estimateId === estimateId) : undefined
                if (!job) return
                const fields = fieldsForCrew(
                  currentOf(job),
                  job.estimateScheduledOn,
                  crew.id,
                  isoDate(new Date()),
                )
                assign(job.estimateId, fields)
              }}
              className={cn(
                "flex h-11 items-center gap-2 rounded-full px-3 text-sm font-medium ring-1 ring-foreground/10",
                over === crew.id && "ring-2 ring-primary",
              )}
              style={{ backgroundColor: crew.color }}
            >
              <span className="size-2 rounded-full bg-foreground/70" />
              {crew.name}
            </div>
          </li>
        ))}
      </ul>

      <div className="grid items-start gap-4 lg:grid-cols-4">
        {COLUMNS.map((column) => {
          const cards = jobs.filter((job) => job.status === column.status)
          return (
            <section
              key={column.status}
              data-column={column.status}
              aria-label={column.label}
              onDragOver={(event) => {
                event.preventDefault()
                setOver(column.status)
              }}
              onDragLeave={() => setOver((current) => (current === column.status ? null : current))}
              onDrop={(event) => {
                event.preventDefault()
                setOver(null)
                dropOn(event.dataTransfer.getData("text/plain") || dragging || "", column.status)
              }}
              className={cn(
                "flex min-w-0 flex-col gap-3 rounded-2xl p-2",
                over === column.status && "bg-muted",
              )}
            >
              <header className="flex items-center justify-between px-1">
                <h2 className="text-sm font-semibold">{column.label}</h2>
                <span className="text-xs text-muted-foreground">{cards.length}</span>
              </header>
              {cards.length === 0 ? (
                <p className="rounded-2xl border border-dashed border-border px-3 py-6 text-center text-sm text-muted-foreground">
                  {column.empty}
                </p>
              ) : (
                cards.map((job) => (
                  <JobCard
                    key={job.estimateId}
                    job={job}
                    crews={crews}
                    onDragId={setDragging}
                    onStatus={(status) => moveTo(job, status)}
                    onCrew={(crewId) => {
                      if (!crewId) {
                        assign(job.estimateId, {
                          status: job.status,
                          assignedCrewId: null,
                          scheduledStartDate: job.status === "unscheduled" ? null : job.scheduledStartDate,
                        })
                        return
                      }
                      assign(
                        job.estimateId,
                        fieldsForCrew(currentOf(job), job.estimateScheduledOn, crewId, isoDate(new Date())),
                      )
                    }}
                    onDate={(date) => assign(job.estimateId, fieldsForDate(currentOf(job), date))}
                  />
                ))
              )}
            </section>
          )
        })}
      </div>
    </div>
  )
}

function JobCard({
  job,
  crews,
  onStatus,
  onCrew,
  onDate,
  onDragId,
}: {
  job: DispatchJob
  crews: CrewLead[]
  onStatus: (status: DispatchStatus) => void
  onDragId: (id: string | null) => void
  onCrew: (crewId: string | null) => void
  onDate: (date: string | null) => void
}) {
  const sheetHref =
    job.status === "unscheduled" ? `/estimates/${job.estimateId}` : `/work-orders/${job.estimateId}`

  return (
    <article
      data-job-id={job.estimateId}
      draggable
      onDragStart={(event) => {
        event.dataTransfer.setData("text/plain", job.estimateId)
        event.dataTransfer.effectAllowed = "move"
        onDragId(job.estimateId)
      }}
      onDragEnd={() => onDragId(null)}
      className="flex flex-col gap-3 rounded-2xl bg-card p-3 ring-1 ring-foreground/10"
    >
      <div className="flex items-start gap-2">
        <GripVertical className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
        <div className="min-w-0 flex-1">
          <Link href={sheetHref} className="font-medium hover:underline">
            {job.clientName}
          </Link>
          <p className="truncate text-sm text-muted-foreground">{job.title}</p>
          <p className="truncate text-sm">{job.address}</p>
          <p className="mt-1 text-sm font-medium tabular-nums">{hoursLabel(job.hours)}</p>
        </div>
      </div>
      {job.crewName && job.scheduledStartDate ? (
        <p
          className="rounded-lg px-2 py-1 text-xs font-medium"
          style={{ backgroundColor: job.crewColor ?? "#efe9dc" }}
        >
          {job.crewName}
          {job.notifiedAt ? " notified" : ""} · {jobDate(job.scheduledStartDate)}
        </p>
      ) : null}
      <label className="grid gap-1 text-xs font-medium text-muted-foreground">
        Status
        <select
          aria-label={`Status for ${job.clientName}`}
          value={job.status}
          onChange={(event) => onStatus(event.target.value as DispatchStatus)}
          className="h-10 rounded-lg border border-input bg-transparent px-2 text-sm text-foreground"
        >
          {COLUMNS.map((column) => (
            <option key={column.status} value={column.status}>
              {column.label}
            </option>
          ))}
        </select>
      </label>
      <label className="grid gap-1 text-xs font-medium text-muted-foreground">
        Crew lead
        <select
          aria-label={`Crew for ${job.clientName}`}
          value={job.crewId ?? ""}
          onChange={(event) => onCrew(event.target.value || null)}
          className="h-10 rounded-lg border border-input bg-transparent px-2 text-sm text-foreground"
        >
          <option value="">Unassigned</option>
          {crews.map((crew) => (
            <option key={crew.id} value={crew.id}>
              {crew.name}
            </option>
          ))}
        </select>
      </label>
      <PhotoGallery estimateId={job.estimateId} compact />
      {job.status !== "unscheduled" ? (
        <label className="grid gap-1 text-xs font-medium text-muted-foreground">
          Start date
          <input
            type="date"
            aria-label={`Start date for ${job.clientName}`}
            value={job.scheduledStartDate ?? ""}
            onChange={(event) => onDate(event.target.value || null)}
            className="h-10 rounded-lg border border-input bg-transparent px-2 text-sm text-foreground"
          />
        </label>
      ) : null}
    </article>
  )
}
