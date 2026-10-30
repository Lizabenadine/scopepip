"use client"

import Link from "next/link"
import { useEffect, useRef, useState } from "react"
import { ScheduleDialog } from "@/components/pipeline/schedule-dialog"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { localVisitClock } from "@/lib/appointments/visit"
import { useScope } from "@/lib/data/store"
import { boardColumns, jobStageOf, nextSalesStage, SALES_COLUMNS, salesStageOf } from "@/lib/pipeline/board"
import type { Estimate } from "@/lib/types"

export function DealMenu({
  estimate,
  clientName,
  mode,
}: {
  estimate: Estimate
  clientName: string
  mode: "sales" | "jobs"
}) {
  const { session, stages, moveStage, addEstimateNote, scheduleSalesVisit, advanceSalesStage, archiveEstimate, assignWorkOrder, workOrders, markCustomerReply, placeOnColumn, customColumns, columnLabels } =
    useScope()
  const limited = session?.role === "project_manager"
  const menuRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const [appointments, setAppointments] = useState(false)
  const [schedule, setSchedule] = useState<"visit" | "job" | null>(null)
  const [noteOpen, setNoteOpen] = useState(false)
  const [messagesOpen, setMessagesOpen] = useState(false)
  const [note, setNote] = useState("")
  const [point, setPoint] = useState<{ top: number; left: number } | null>(null)
  const scheduledStage = stages.find((stage) => stage.slug === "scheduled")
  const order = workOrders.find((item) => item.estimateId === estimate.id)
  const salesStage = salesStageOf(estimate)
  const nextSales = salesStage ? nextSalesStage(salesStage) : null
  const canAdvanceSales = mode === "sales" && nextSales !== null
  const nextSalesLabel = nextSales
    ? columnLabels?.[nextSales]?.trim() || SALES_COLUMNS.find((column) => column.id === nextSales)?.label
    : null
  const nextJobLabel =
    !order || order.status === "unscheduled"
      ? "Scheduled"
      : order.status === "scheduled"
        ? "In production"
        : order.status === "in_progress"
          ? "Completed"
          : null
  const canAdvanceJob = mode === "jobs" && order?.status !== "complete"
  const columns = boardColumns({ customColumns, columnLabels }, mode)
  const moveTargets = mode === "sales" ? columns : columns.filter((column) => column.custom)
  const stageSlug = stages.find((stage) => stage.id === estimate.stageId)?.slug
  const parked = columns.some((column) => column.custom && column.id === estimate.boardColumnId) ? estimate.boardColumnId : null
  const currentColumn = parked ?? (mode === "sales" ? salesStage : jobStageOf(estimate, order, stageSlug))

  useEffect(() => {
    if (!open) return
    const close = (event: Event) => {
      const node = event.target
      if (node instanceof Node && menuRef.current?.contains(node)) return
      setOpen(false)
    }
    window.addEventListener("scroll", close, true)
    window.addEventListener("resize", close)
    return () => {
      window.removeEventListener("scroll", close, true)
      window.removeEventListener("resize", close)
    }
  }, [open])

  return (
    <>
      <button
        type="button"
        aria-label={`Deal actions for ${clientName}`}
        aria-expanded={open}
        data-testid={`deal-menu-${estimate.id}`}
        className="text-xs font-medium text-muted-foreground hover:text-foreground"
        onClick={(event) => {
          const rect = event.currentTarget.getBoundingClientRect()
          setPoint({ top: rect.bottom + 6, left: Math.max(8, rect.right - 240) })
          setAppointments(false)
          setOpen((current) => !current)
        }}
      >
        Actions
      </button>
      {open && point ? (
        <>
          <button type="button" aria-label="Close deal menu" className="fixed inset-0 z-40 cursor-default" onClick={() => setOpen(false)} />
          <div
            role="menu"
            data-testid={`deal-actions-${estimate.id}`}
            ref={menuRef}
            className="fixed z-50 max-h-[70vh] w-60 overflow-y-auto rounded-2xl border border-border bg-popover py-1 text-sm text-popover-foreground shadow-md"
            style={{ top: point.top, left: point.left }}
          >
            {limited ? (
              <>
                <MenuLink href={`/work-orders/${estimate.id}`} onClick={() => setOpen(false)}>
                  Work order
                </MenuLink>
                <MenuLink href="/payments" onClick={() => setOpen(false)}>
                  Invoices
                </MenuLink>
              </>
            ) : null}
            {limited ? null : (
            <>
            <MenuLink href={`/estimates/${estimate.id}`} onClick={() => setOpen(false)}>
              Open estimate
            </MenuLink>
            <MenuLink href={`/clients/${estimate.clientId}`} onClick={() => setOpen(false)}>
              Open client
            </MenuLink>
            <MenuLink href={`/inbox?client=${estimate.clientId}`} onClick={() => setOpen(false)}>
              Texts
            </MenuLink>
            {mode === "jobs" ? (
              <MenuLink href={`/work-orders/${estimate.id}`} onClick={() => setOpen(false)}>
                Crew sheet
              </MenuLink>
            ) : null}
            <MenuButton
              testId={`advance-${estimate.id}`}
              disabled={mode === "sales" ? !canAdvanceSales : !canAdvanceJob}
              onClick={() => {
                setOpen(false)
                if (mode === "sales") {
                  advanceSalesStage(estimate.id)
                  return
                }
                if (!order || order.status === "unscheduled") {
                  setSchedule("job")
                  return
                }
                if (order.status === "scheduled") {
                  assignWorkOrder(estimate.id, {
                    status: "in_progress",
                    assignedCrewId: order.assignedCrewId,
                    scheduledStartDate: order.scheduledStartDate,
                  })
                  return
                }
                if (order.status === "in_progress") {
                  assignWorkOrder(estimate.id, {
                    status: "complete",
                    assignedCrewId: order.assignedCrewId,
                    scheduledStartDate: order.scheduledStartDate,
                  })
                }
              }}
            >
              {mode === "sales" ? (nextSalesLabel ?? "Move forward") : (nextJobLabel ?? "Move forward")}
            </MenuButton>
            <div className="mx-2 my-1 rounded-xl bg-muted py-1" data-testid={`move-columns-${estimate.id}`}>
              <p className="px-3 py-1 text-xs font-medium text-muted-foreground">Move to</p>
              {moveTargets.map((column) => (
                <button
                  key={column.id}
                  type="button"
                  role="menuitem"
                  data-testid={`place-${estimate.id}-${column.id}`}
                  disabled={column.id === currentColumn}
                  className="block w-full truncate px-3 py-2 text-left text-sm hover:bg-card disabled:text-muted-foreground"
                  onClick={() => {
                    setOpen(false)
                    placeOnColumn(estimate.id, column.id)
                  }}
                >
                  {column.label}
                </button>
              ))}
              {mode === "jobs" && estimate.boardColumnId ? (
                <button
                  type="button"
                  role="menuitem"
                  data-testid={`place-${estimate.id}-pipeline`}
                  className="block w-full px-3 py-2 text-left text-sm hover:bg-card"
                  onClick={() => {
                    setOpen(false)
                    placeOnColumn(estimate.id, "project_accepted")
                  }}
                >
                  Job column
                </button>
              ) : null}
            </div>
            <MenuLink href={`/estimates/${estimate.id}`} onClick={() => setOpen(false)}>
              Edit proposal
            </MenuLink>
            <MenuButton testId={`book-date-${estimate.id}`} onClick={() => setAppointments((current) => !current)}>
              {appointments ? "Hide dates" : "Book a date"}
            </MenuButton>
            {appointments ? (
              <div className="mx-2 mb-1 rounded-xl bg-muted py-1">
                <button
                  type="button"
                  data-testid={`book-visit-${estimate.id}`}
                  className="block w-full px-3 py-2 text-left text-sm hover:bg-card"
                  onClick={() => {
                    setOpen(false)
                    setSchedule("visit")
                  }}
                >
                  Estimate visit
                </button>
                <button
                  type="button"
                  className="block w-full px-3 py-2 text-left text-sm hover:bg-card"
                  onClick={() => {
                    setOpen(false)
                    setSchedule("job")
                  }}
                >
                  Job start
                </button>
              </div>
            ) : null}
            <MenuButton
              testId={`customer-replied-${estimate.id}`}
              onClick={() => {
                setOpen(false)
                markCustomerReply(estimate.id)
              }}
            >
              Customer replied
            </MenuButton>
            <MenuButton
              testId={`follow-up-messages-${estimate.id}`}
              onClick={() => {
                setOpen(false)
                setMessagesOpen(true)
              }}
            >
              Messages
            </MenuButton>
            <MenuButton
              onClick={() => {
                setOpen(false)
                setNoteOpen(true)
              }}
            >
              Notes
            </MenuButton>
            <MenuButton
              onClick={() => {
                setOpen(false)
                archiveEstimate(estimate.id)
              }}
            >
              Archive
            </MenuButton>
            </>
            )}
          </div>
        </>
      ) : null}
      {schedule ? (
        <ScheduleDialog
          open
          kind={schedule}
          clientName={clientName}
          initialDate={schedule === "visit" ? (estimate.estimateVisitOn ?? null) : estimate.scheduledOn}
          initialTime={schedule === "visit" ? localVisitClock(estimate.estimateVisitAt) : ""}
          onOpenChange={(next) => {
            if (!next) setSchedule(null)
          }}
          onConfirm={(date, time) => {
            if (schedule === "visit" && time) scheduleSalesVisit(estimate.id, date, time)
            if (schedule === "job" && scheduledStage) moveStage(estimate.id, scheduledStage.id, date)
            setSchedule(null)
          }}
        />
      ) : null}
      <Dialog open={messagesOpen} onOpenChange={setMessagesOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Messages</DialogTitle>
            <DialogDescription>Follow-up messages logged for {clientName}.</DialogDescription>
          </DialogHeader>
          <div className="flex max-h-80 flex-col gap-3 overflow-y-auto" data-testid={`follow-up-log-${estimate.id}`}>
            {(estimate.followUpLog ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">No messages yet.</p>
            ) : (
              (estimate.followUpLog ?? []).map((message) => (
                <article key={message.id} className="rounded-xl bg-muted px-3 py-2 text-sm">
                  <p className="font-medium">
                    {message.channel === "email" ? "Email" : "Text"} · {message.delivery}
                  </p>
                  {message.subject ? <p>{message.subject}</p> : null}
                  <p className="whitespace-pre-wrap text-muted-foreground">{message.body}</p>
                  <p className="text-xs text-muted-foreground">{message.detail}</p>
                </article>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={noteOpen} onOpenChange={setNoteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Notes</DialogTitle>
            <DialogDescription>Notes on {clientName}&apos;s deal. There is no character cap.</DialogDescription>
          </DialogHeader>
          {estimate.notes.trim() ? (
            <p className="max-h-40 overflow-y-auto text-sm whitespace-pre-wrap text-slate-700">{estimate.notes}</p>
          ) : (
            <p className="text-sm text-muted-foreground">No notes yet.</p>
          )}
          <div className="grid gap-2">
            <Label htmlFor={`note-${estimate.id}`}>Add a note</Label>
            <textarea
              id={`note-${estimate.id}`}
              value={note}
              onChange={(event) => setNote(event.target.value)}
              rows={6}
              placeholder="Enter detailed scope, prep notes, or painting instructions..."
              className="min-h-20 w-full rounded-lg border border-input bg-transparent px-3 py-2 text-base outline-none"
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              className="h-11"
              disabled={!note.trim()}
              onClick={() => {
                addEstimateNote(estimate.id, note)
                setNote("")
                setNoteOpen(false)
              }}
            >
              Save note
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

function MenuLink({
  href,
  onClick,
  children,
}: {
  href: string
  onClick: () => void
  children: string
}) {
  return (
    <Link href={href} role="menuitem" onClick={onClick} className="block px-3 py-2 hover:bg-muted">
      {children}
    </Link>
  )
}

function MenuButton({
  onClick,
  disabled,
  children,
  testId,
}: {
  onClick: () => void
  disabled?: boolean
  children: string
  testId?: string
}) {
  return (
    <button
      type="button"
      role="menuitem"
      data-testid={testId}
      disabled={disabled}
      onClick={onClick}
      className="block w-full px-3 py-2 text-left hover:bg-muted disabled:cursor-not-allowed disabled:text-muted-foreground"
    >
      {children}
    </button>
  )
}
