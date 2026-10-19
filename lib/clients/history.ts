import type { Client, Estimate, TextMessage } from "../types.ts"
import type { FollowUpMessage } from "../follow-ups/types.ts"

export interface HistoryEntry {
  id: string
  at: string
  kind: "text" | "email" | "proposal" | "stage" | "note"
  label: string
  body: string
}

export function contactHistory(client: Client, estimates: Estimate[]): HistoryEntry[] {
  const jobs = estimates.filter((estimate) => estimate.clientId === client.id)
  const entries: HistoryEntry[] = []
  for (const message of client.messages ?? []) entries.push(textEntry(message, jobs))
  for (const estimate of jobs) {
    for (const message of estimate.followUpLog ?? []) {
      if (message.channel !== "email") continue
      entries.push(emailEntry(message, estimate.title))
    }
    for (const opened of estimate.proposalOpens ?? []) {
      entries.push({
        id: opened.id,
        at: opened.at,
        kind: "proposal",
        label: opened.kind === "revisit" ? "Opened the proposal again" : "Opened the proposal",
        body: estimate.title,
      })
    }
    for (const change of estimate.stageChanges ?? []) {
      entries.push({
        id: change.id,
        at: change.at,
        kind: "stage",
        label: change.label,
        body: estimate.title,
      })
    }
    const notes = estimate.noteLog ?? []
    if (notes.length > 0) {
      for (const note of notes) {
        entries.push({ id: note.id, at: note.at, kind: "note", label: "Note", body: `${estimate.title}: ${note.body}` })
      }
    } else if (estimate.notes.trim()) {
      entries.push({
        id: `notes-${estimate.id}`,
        at: estimate.createdAt,
        kind: "note",
        label: "Note",
        body: `${estimate.title}: ${estimate.notes.trim()}`,
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
    })
  }
  return entries.sort((left, right) => right.at.localeCompare(left.at) || right.id.localeCompare(left.id))
}

function textEntry(message: TextMessage, jobs: Estimate[]): HistoryEntry {
  const title = jobs.find((estimate) => estimate.id === message.estimateId)?.title
  const body = message.body.trim() || "Photo"
  return {
    id: message.id,
    at: message.createdAt,
    kind: "text",
    label: message.direction === "in" ? "Text received" : "Text sent",
    body: title ? `${title}: ${body}` : body,
  }
}

function emailEntry(message: FollowUpMessage, title: string): HistoryEntry {
  return {
    id: message.id,
    at: message.sentAt,
    kind: "email",
    label: message.subject.trim() ? `Email: ${message.subject.trim()}` : "Email",
    body: `${title}: ${message.body.trim()}`,
  }
}
