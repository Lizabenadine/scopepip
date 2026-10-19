import fs from "node:fs"
import path from "node:path"
import { INBOUND_LEAD_SOURCES } from "../types.ts"
import type { InboundLead } from "./types.ts"

function spoolFile(): string {
  return process.env.LEAD_SPOOL_PATH || path.join(process.cwd(), "data", "lead-spool.json")
}

export function readLeadSpool(): InboundLead[] {
  try {
    const raw = fs.readFileSync(spoolFile(), "utf8")
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(isInboundLead)
  } catch {
    return []
  }
}

export function addLeadSpool(lead: InboundLead): InboundLead[] {
  const current = readLeadSpool()
  if (current.some((item) => item.id === lead.id)) return current
  const next = [...current, lead].slice(-200)
  writeSpool(next)
  return next
}

export function ackLeadSpool(ids: string[]): InboundLead[] {
  const drop = new Set(ids)
  const next = readLeadSpool().filter((lead) => !drop.has(lead.id))
  writeSpool(next)
  return next
}

function writeSpool(leads: InboundLead[]) {
  const file = spoolFile()
  fs.mkdirSync(path.dirname(file), { recursive: true })
  fs.writeFileSync(file, JSON.stringify(leads))
}

function isInboundLead(value: unknown): value is InboundLead {
  if (!value || typeof value !== "object") return false
  const lead = value as InboundLead
  return (
    typeof lead.id === "string" &&
    typeof lead.name === "string" &&
    typeof lead.phone === "string" &&
    typeof lead.email === "string" &&
    typeof lead.address === "string" &&
    typeof lead.message === "string" &&
    typeof lead.createdAt === "string" &&
    (lead.companyId === undefined || typeof lead.companyId === "string") &&
    INBOUND_LEAD_SOURCES.some((source) => source === lead.source)
  )
}
