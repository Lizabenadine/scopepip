import type { Client, ClientInteraction, Estimate, TextMessage, WorkOrder } from "../types.ts"
import type { FollowUpMessage } from "../follow-ups/types.ts"

export interface HistoryEntry {
  id: string
  at: string
  kind: "text" | "email" | "call" | "proposal" | "stage" | "note" | "job" | "payment" | "followup"
  label: string
  body: string
  status: string
}

export interface TimelineContext {
  workOrders?: WorkOrder[]
}

export function contactHistory(client: Client, estimates: Estimate[], context: TimelineContext = {}): HistoryEntry[] {
  const jobs = estimates.filter((estimate) => estimate.clientId === client.id)
  const messageIds = new Set((client.messages ?? []).map((message) => message.id))
  const entries: HistoryEntry[] = []
  for (const interaction of client.interactions ?? []) entries.push(interactionEntry(interaction))
  for (const message of client.messages ?? []) entries.push(textEntry(message, jobs))
  for (const estimate of jobs) {
    entries.push({
      id: `lead-${estimate.id}`,
      at: estimate.createdAt,
      kind: "stage",
      label: "Lead created",
      body: estimate.title,
      status: "Recorded",
    })
    for (const message of estimate.followUpLog ?? []) {
      if (message.channel === "text" && messageIds.has(message.id)) continue
      entries.push(followUpEntry(message, estimate.title))
    }
    for (const opened of estimate.proposalOpens ?? []) {
      entries.push({
        id: opened.id,
        at: opened.at,
        kind: "proposal",
        label: opened.kind === "revisit" ? "Opened the proposal again" : "Opened the proposal",
        body: estimate.title,
        status: "Viewed",
      })
    }
    if (estimate.clientStatus === "sent" || estimate.clientStatus === "accepted" || estimate.clientStatus === "declined") {
      entries.push({
        id: `proposal-sent-${estimate.id}`,
        at: estimate.updatedAt,
        kind: "proposal",
        label: "Proposal sent",
        body: estimate.title,
        status: "Sent",
      })
    }
    if (estimate.acceptedAt) {
      entries.push({
        id: `accepted-${estimate.id}`,
        at: estimate.acceptedAt,
        kind: "proposal",
        label: "Proposal accepted",
        body: estimate.title,
        status: "Accepted",
      })
    }
    if (estimate.declinedAt) {
      entries.push({
        id: `declined-${estimate.id}`,
        at: estimate.declinedAt,
        kind: "proposal",
        label: "Proposal declined",
        body: estimate.title,
        status: "Declined",
      })
    }
    if (estimate.estimateVisitAt) {
      entries.push({
        id: `visit-${estimate.id}`,
        at: estimate.estimateVisitAt,
        kind: "job",
        label: "Appointment scheduled",
        body: estimate.title,
        status: "Scheduled",
      })
    }
    if (estimate.depositReceipt?.paidAt) {
      entries.push({
        id: `payment-${estimate.depositReceipt.paymentIntentId}`,
        at: estimate.depositReceipt.paidAt,
        kind: "payment",
        label: "Payment received",
        body: `${estimate.title}: $${estimate.depositReceipt.amount.toFixed(2)}`,
        status: estimate.paymentStatus === "paid" ? "Paid" : "Deposit",
      })
    }
    for (const change of estimate.stageChanges ?? []) {
      entries.push({
        id: change.id,
        at: change.at,
        kind: "stage",
        label: change.label,
        body: estimate.title,
        status: "Updated",
      })
    }
    for (const activity of estimate.activity ?? []) {
      entries.push({
        id: activity.id,
        at: activity.at,
        kind: "stage",
        label: "Estimate updated",
        body: `${estimate.title}: ${activity.label}`,
        status: "Updated",
      })
    }
    if (estimate.followUp?.status === "stopped") {
      entries.push({
        id: `follow-stop-${estimate.id}`,
        at: estimate.updatedAt,
        kind: "followup",
        label: "Follow-up stopped",
        body: estimate.title,
        status: stopStatus(estimate.followUp.stoppedReason),
      })
    }
    const notes = estimate.noteLog ?? []
    if (notes.length > 0) {
      for (const note of notes) {
        entries.push({
          id: note.id,
          at: note.at,
          kind: "note",
          label: "Note",
          body: `${estimate.title}: ${note.body}`,
          status: "Internal",
        })
      }
    } else if (estimate.notes.trim()) {
      entries.push({
        id: `notes-${estimate.id}`,
        at: estimate.createdAt,
        kind: "note",
        label: "Note",
        body: `${estimate.title}: ${estimate.notes.trim()}`,
        status: "Internal",
      })
    }
    const order = context.workOrders?.find((item) => item.estimateId === estimate.id)
    if (order?.scheduledStartDate) {
      entries.push({
        id: `job-scheduled-${estimate.id}`,
        at: `${order.scheduledStartDate}T12:00:00.000Z`,
        kind: "job",
        label: "Job scheduled",
        body: estimate.title,
        status: "Scheduled",
      })
    }
    if (order?.status === "in_progress") {
      entries.push({
        id: `job-started-${estimate.id}`,
        at: estimate.updatedAt,
        kind: "job",
        label: "Job started",
        body: estimate.title,
        status: "In progress",
      })
    }
    if (order?.status === "complete") {
      entries.push({
        id: `job-completed-${estimate.id}`,
        at: estimate.updatedAt,
        kind: "job",
        label: "Job completed",
        body: estimate.title,
        status: "Completed",
      })
    }
  }
  if (client.notes.trim()) {
    entries.push({
      id: `contact-note-${client.id}`,
      at: client.updatedAt,
      kind: "note",
      label: "Contact note",
      body: client.notes.trim(),
      status: "Internal",
    })
  }
  return entries.sort((left, right) => right.at.localeCompare(left.at) || right.id.localeCompare(left.id))
}

function interactionEntry(interaction: ClientInteraction): HistoryEntry {
  return {
    id: interaction.id,
    at: interaction.at,
    kind: interaction.kind === "call" ? "call" : "note",
    label: interaction.kind === "call" ? "Call" : "Internal note",
    body: interaction.body,
    status: "Internal",
  }
}

function textEntry(message: TextMessage, jobs: Estimate[]): HistoryEntry {
  const title = jobs.find((estimate) => estimate.id === message.estimateId)?.title
  const body = message.body.trim() || "Photo"
  const received = message.direction === "in"
  return {
    id: message.id,
    at: message.createdAt,
    kind: "text",
    label: received ? "Text received" : "Text sent",
    body: title ? `${title}: ${body}` : body,
    status: received ? "Received" : messageStatus(message.delivery),
  }
}

function followUpEntry(message: FollowUpMessage, title: string): HistoryEntry {
  const channel = message.channel === "email" ? "Email" : "Text"
  const status = messageStatus(message.delivery)
  const subject = message.subject.trim()
  return {
    id: message.id,
    at: message.sentAt,
    kind: message.channel === "email" ? "email" : "text",
    label: subject ? `${channel} ${status.toLowerCase()}: ${subject}` : `${channel} ${status.toLowerCase()}`,
    body: `${title}: ${message.body.trim()}`,
    status,
  }
}

function messageStatus(delivery: string): string {
  if (delivery === "sent") return "Sent"
  if (delivery === "failed") return "Failed"
  if (delivery === "received") return "Received"
  if (delivery === "skipped") return "Not sent"
  return "Logged"
}

function stopStatus(reason: string | null | undefined): string {
  if (reason === "reply") return "Customer replied"
  if (reason === "accepted") return "Proposal accepted"
  if (reason === "declined") return "Proposal declined"
  if (reason === "canceled") return "Canceled"
  if (reason === "archived") return "Lost"
  if (reason === "visit_booked") return "Visit booked"
  return "Stopped"
}
