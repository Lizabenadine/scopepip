import fs from "node:fs"
import path from "node:path"
import { ENGAGEMENT_EVENTS, type ProposalEngagementEvent } from "./engagement.ts"
import { proposalEventId } from "./opens.ts"

export interface SpooledProposalEvent extends ProposalEngagementEvent {
  id: string
}

function spoolFile(): string {
  return process.env.PROPOSAL_EVENT_SPOOL_PATH || path.join(process.cwd(), "data", "proposal-events.json")
}

export function readProposalEvents(): SpooledProposalEvent[] {
  try {
    const raw = fs.readFileSync(spoolFile(), "utf8")
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(isSpooled)
  } catch {
    return []
  }
}

export function addProposalEvent(event: ProposalEngagementEvent): SpooledProposalEvent[] {
  const current = readProposalEvents()
  const id = proposalEventId(event)
  if (current.some((item) => item.id === id)) return current
  const next = [...current, { ...event, id }].slice(-200)
  const file = spoolFile()
  fs.mkdirSync(path.dirname(file), { recursive: true })
  fs.writeFileSync(file, JSON.stringify(next))
  return next
}

export function ackProposalEvents(ids: string[]): SpooledProposalEvent[] {
  const drop = new Set(ids)
  const next = readProposalEvents().filter((event) => !drop.has(event.id))
  const file = spoolFile()
  fs.mkdirSync(path.dirname(file), { recursive: true })
  fs.writeFileSync(file, JSON.stringify(next))
  return next
}

function isSpooled(value: unknown): value is SpooledProposalEvent {
  if (!value || typeof value !== "object") return false
  const event = value as SpooledProposalEvent
  return (
    typeof event.id === "string" &&
    typeof event.proposalId === "string" &&
    typeof event.timestamp === "string" &&
    typeof event.userAgent === "string" &&
    (event.sectionName === null || typeof event.sectionName === "string") &&
    ENGAGEMENT_EVENTS.some((kind) => kind === event.eventType)
  )
}
