"use client"

import Link from "next/link"
import { useEffect, useRef, useState, type ReactNode } from "react"
import { cardNoteEntries, formatNoteTimestamp } from "@/components/pipeline/card-notes-section"
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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { localVisitClock } from "@/lib/appointments/visit"
import { useScope } from "@/lib/data/store"
import { boardColumns, jobStageOf, nextSalesStage, SALES_COLUMNS, salesStageOf } from "@/lib/pipeline/board"
import type { Estimate } from "@/lib/types"
import { cn } from "@/lib/utils"

export function DealMenu({
  estimate,
  clientName,
  mode,
}: {
  estimate: Estimate
  clientName: string
  mode: "sales" | "jobs"
}) {
  const {
    session,
    stages,
    crews,
    addEstimateNote,
    scheduleSalesVisit,
    advanceSalesStage,
    archiveEstimate,
    deleteEstimate,
    assignWorkOrder,
    workOrders,
    markCustomerReply,
    placeOnColumn,
    customColumns,
    columnLabels,
    clients,
    updateLead,
  } = useScope()
  const noteEntries = cardNoteEntries(estimate)
  const client = clients.find((item) => item.id === estimate.clientId)
  const limited = session?.role === "project_manager"
  const menuRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const [appointments, setAppointments] = useState(false)
  const [schedule, setSchedule] = useState<"visit" | "job" | null>(null)
  const [noteOpen, setNoteOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [editName, setEditName] = useState("")
  const [editTitle, setEditTitle] = useState("")
  const [editPhone, setEditPhone] = useState("")
  const [editEmail, setEditEmail] = useState("")
  const [editAddress, setEditAddress] = useState("")
  const [messagesOpen, setMessagesOpen] = useState(false)
  const [note, setNote] = useState("")
  const [point, setPoint] = useState<{ top?: number; bottom?: number; left: number; maxHeight: number } | null>(null)
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

  const openEditDialog = () => {
    setEditName(client?.name ?? clientName ?? "")
    setEditTitle(estimate.title ?? "")
    setEditPhone(client?.phone ?? "")
    setEditEmail(client?.email ?? "")
    setEditAddress(estimate.jobAddress || client?.address || "")
    setEditOpen(true)
  }

  const handleSaveLead = () => {
    updateLead(estimate.id, {
      name: editName,
      title: editTitle,
      phone: editPhone,
      email: editEmail,
      address: editAddress,
    })
    setEditOpen(false)
  }

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
          const spaceBelow = window.innerHeight - rect.bottom
          const spaceAbove = rect.top
          const openUpward = spaceBelow < 420 && spaceAbove > spaceBelow
          const maxHeight = Math.max(180, Math.min(520, (openUpward ? spaceAbove : spaceBelow) - 16))
          if (openUpward) {
            setPoint({
              bottom: window.innerHeight - rect.top + 6,
              left: Math.max(8, rect.right - 240),
              maxHeight,
            })
          } else {
            setPoint({
              top: rect.bottom + 6,
              left: Math.max(8, rect.right - 240),
              maxHeight,
            })
          }
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
            className="fixed z-50 w-60 overflow-y-auto rounded-2xl border border-border bg-popover py-1.5 text-sm text-popover-foreground shadow-lg"
            style={{
              top: point.top,
              bottom: point.bottom,
              left: point.left,
              maxHeight: point.maxHeight,
            }}
          >
            {limited ? (
              <>
                <div className="px-2 py-1">
                  <p className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                    Details
                  </p>
                  <MenuLink href={`/work-orders/${estimate.id}`} onClick={() => setOpen(false)}>
                    Work order
                  </MenuLink>
                  <MenuLink href="/payments" onClick={() => setOpen(false)}>
                    Invoices
                  </MenuLink>
                </div>

                <div className="my-1 border-t border-border/60" />

                <div className="px-2 py-1">
                  <p className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                    Schedule & Notes
                  </p>
                  <MenuButton
                    testId={`pm-schedule-${estimate.id}`}
                    onClick={() => {
                      setOpen(false)
                      setSchedule("job")
                    }}
                  >
                    Schedule / Crew
                  </MenuButton>
                  <MenuButton
                    testId={`pm-notes-${estimate.id}`}
                    onClick={() => {
                      setOpen(false)
                      setNoteOpen(true)
                    }}
                  >
                    Notes
                  </MenuButton>
                </div>

                <div className="my-1 border-t border-border/60" />

                <div className="px-2 py-1">
                  <p className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                    Manage
                  </p>
                  <MenuButton
                    testId={`delete-job-${estimate.id}`}
                    className="text-rose-600 hover:bg-rose-50 hover:text-rose-700 dark:text-rose-400 dark:hover:bg-rose-950/30 font-medium"
                    onClick={() => {
                      setOpen(false)
                      setConfirmDelete(true)
                    }}
                  >
                    Delete
                  </MenuButton>
                </div>
              </>
            ) : (
              <>
                {/* Section 1: Lead & Job Details */}
                <div className="px-2 py-1">
                  <p className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                    {mode === "sales" ? "Lead Details" : "Job Details"}
                  </p>
                  <MenuButton
                    testId={mode === "sales" ? `edit-lead-${estimate.id}` : `edit-job-${estimate.id}`}
                    onClick={() => {
                      setOpen(false)
                      openEditDialog()
                    }}
                  >
                    {mode === "sales" ? "Edit / Rename Lead" : "Edit / Rename Job"}
                  </MenuButton>
                  <MenuLink href={`/estimates/${estimate.id}`} onClick={() => setOpen(false)}>
                    Open estimate
                  </MenuLink>
                  <MenuLink href={`/clients/${estimate.clientId}`} onClick={() => setOpen(false)}>
                    Open client
                  </MenuLink>
                  <MenuLink href={`/estimates/${estimate.id}`} onClick={() => setOpen(false)}>
                    Edit proposal
                  </MenuLink>
                  {mode === "jobs" ? (
                    <MenuLink href={`/work-orders/${estimate.id}`} onClick={() => setOpen(false)}>
                      Crew sheet
                    </MenuLink>
                  ) : null}
                </div>

                <div className="my-1 border-t border-border/60" />

                {/* Section 2: Pipeline & Stage */}
                <div className="px-2 py-1">
                  <p className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                    Pipeline
                  </p>
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
                  <div className="my-1 rounded-xl bg-muted py-1" data-testid={`move-columns-${estimate.id}`}>
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
                  <MenuButton testId={`book-date-${estimate.id}`} onClick={() => setAppointments((current) => !current)}>
                    {appointments ? "Hide dates" : "Book a date"}
                  </MenuButton>
                  {appointments ? (
                    <div className="mb-1 rounded-xl bg-muted py-1">
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
                </div>

                <div className="my-1 border-t border-border/60" />

                {/* Section 3: Communication & Notes */}
                <div className="px-2 py-1">
                  <p className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                    Communication & Notes
                  </p>
                  <MenuLink href={`/inbox?client=${estimate.clientId}`} onClick={() => setOpen(false)}>
                    Texts
                  </MenuLink>
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
                </div>

                <div className="my-1 border-t border-border/60" />

                {/* Section 4: Management & Danger Zone */}
                <div className="px-2 py-1">
                  <p className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                    Manage
                  </p>
                  <MenuButton
                    onClick={() => {
                      setOpen(false)
                      archiveEstimate(estimate.id)
                    }}
                  >
                    Archive
                  </MenuButton>
                  <MenuButton
                    testId={mode === "sales" ? `delete-lead-${estimate.id}` : `delete-job-${estimate.id}`}
                    className="text-rose-600 hover:bg-rose-50 hover:text-rose-700 dark:text-rose-400 dark:hover:bg-rose-950/30 font-medium"
                    onClick={() => {
                      setOpen(false)
                      setConfirmDelete(true)
                    }}
                  >
                    Delete
                  </MenuButton>
                </div>
              </>
            )}
          </div>
        </>
      ) : null}

      {/* Edit / Rename Lead Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent data-testid={`edit-dialog-${estimate.id}`} className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{mode === "sales" ? "Edit Lead" : "Edit Job Details"}</DialogTitle>
            <DialogDescription>
              {mode === "sales"
                ? "Update this lead's name, job title, and contact information."
                : "Update the job title, client name, and contact details."}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3.5 py-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`edit-name-${estimate.id}`}>Lead / Contact Name</Label>
              <Input
                id={`edit-name-${estimate.id}`}
                data-testid={`edit-name-${estimate.id}`}
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Client or homeowner name"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`edit-title-${estimate.id}`}>Job Title / Project</Label>
              <Input
                id={`edit-title-${estimate.id}`}
                data-testid={`edit-title-${estimate.id}`}
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                placeholder="e.g. Interior living room, Exterior repaint"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor={`edit-phone-${estimate.id}`}>Phone Number</Label>
                <Input
                  id={`edit-phone-${estimate.id}`}
                  data-testid={`edit-phone-${estimate.id}`}
                  type="tel"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  placeholder="(555) 000-0000"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor={`edit-email-${estimate.id}`}>Email Address</Label>
                <Input
                  id={`edit-email-${estimate.id}`}
                  data-testid={`edit-email-${estimate.id}`}
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  placeholder="name@example.com"
                />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`edit-address-${estimate.id}`}>Property Address</Label>
              <Input
                id={`edit-address-${estimate.id}`}
                data-testid={`edit-address-${estimate.id}`}
                value={editAddress}
                onChange={(e) => setEditAddress(e.target.value)}
                placeholder="Street address, City, ST"
              />
            </div>
          </div>
          <DialogFooter className="flex flex-row justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              data-testid={`cancel-edit-${estimate.id}`}
              onClick={() => setEditOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              data-testid={`save-edit-lead-${estimate.id}`}
              onClick={handleSaveLead}
            >
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {schedule ? (
        <ScheduleDialog
          open
          kind={schedule}
          clientName={clientName}
          initialDate={schedule === "visit" ? (estimate.estimateVisitOn ?? null) : (order?.scheduledStartDate ?? estimate.scheduledOn)}
          initialCrewId={schedule === "job" ? (order?.assignedCrewId ?? null) : null}
          crews={schedule === "job" ? crews : []}
          initialTime={schedule === "visit" ? localVisitClock(estimate.estimateVisitAt) : ""}
          initialAddress={estimate.jobAddress}
          onOpenChange={(next) => {
            if (!next) setSchedule(null)
          }}
          onConfirm={(date, time, address, crewId) => {
            if (schedule === "visit" && time) scheduleSalesVisit(estimate.id, date, time, address)
            if (schedule === "job") {
              const nextStatus =
                order?.status === "complete" || order?.status === "in_progress"
                  ? order.status
                  : date
                    ? "scheduled"
                    : "unscheduled"
              assignWorkOrder(estimate.id, {
                status: nextStatus,
                scheduledStartDate: date || null,
                assignedCrewId: crewId ?? null,
              })
            }
            setSchedule(null)
          }}
        />
      ) : null}
      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <DialogContent data-testid={`delete-dialog-${estimate.id}`}>
          <DialogHeader>
            <DialogTitle>{mode === "sales" ? "Delete Lead" : "Delete Job"}</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the {mode === "sales" ? "lead" : "job"} for <strong>{clientName}</strong>? This action cannot be undone and will delete only this {mode === "sales" ? "lead" : "job"}.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex flex-row justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              data-testid={`cancel-delete-${estimate.id}`}
              onClick={() => setConfirmDelete(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              data-testid={`confirm-delete-${estimate.id}`}
              onClick={() => {
                deleteEstimate(estimate.id)
                setConfirmDelete(false)
              }}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
            <DialogTitle>Internal Notes</DialogTitle>
            <DialogDescription>Persistent internal notes on {clientName}&apos;s job with timestamps.</DialogDescription>
          </DialogHeader>
          {noteEntries.length > 0 ? (
            <ul className="flex max-h-48 flex-col gap-2 overflow-y-auto">
              {noteEntries.map((entry) => (
                <li key={entry.id} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
                  <p className="text-xs font-medium text-slate-500">{formatNoteTimestamp(entry.at)}</p>
                  <p className="mt-0.5 whitespace-pre-wrap text-slate-800">{entry.body}</p>
                </li>
              ))}
            </ul>
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
  children: ReactNode
}) {
  return (
    <Link href={href} role="menuitem" onClick={onClick} className="block rounded-lg px-3 py-1.5 hover:bg-muted text-sm transition-colors">
      {children}
    </Link>
  )
}

function MenuButton({
  onClick,
  disabled,
  children,
  testId,
  className,
}: {
  onClick: () => void
  disabled?: boolean
  children: ReactNode
  testId?: string
  className?: string
}) {
  return (
    <button
      type="button"
      role="menuitem"
      data-testid={testId}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "block w-full rounded-lg px-3 py-1.5 text-left text-sm hover:bg-muted disabled:cursor-not-allowed disabled:text-muted-foreground transition-colors",
        className,
      )}
    >
      {children}
    </button>
  )
}
