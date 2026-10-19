import fs from "node:fs"
import path from "node:path"

export interface SpoolMessage {
  id: string
  from: string
  body: string
  mediaUrls: string[]
  createdAt: string
}

function spoolFile(): string {
  return process.env.MESSAGE_SPOOL_PATH || path.join(process.cwd(), "data", "message-spool.json")
}

export function readSpool(): SpoolMessage[] {
  try {
    const raw = fs.readFileSync(spoolFile(), "utf8")
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(isSpoolMessage)
  } catch {
    return []
  }
}

export function addSpool(message: SpoolMessage): SpoolMessage[] {
  const current = readSpool()
  if (current.some((item) => item.id === message.id)) return current
  const next = [...current, message].slice(-200)
  writeSpool(next)
  return next
}

export function ackSpool(ids: string[]): SpoolMessage[] {
  const drop = new Set(ids)
  const next = readSpool().filter((item) => !drop.has(item.id))
  writeSpool(next)
  return next
}

function writeSpool(messages: SpoolMessage[]) {
  const file = spoolFile()
  fs.mkdirSync(path.dirname(file), { recursive: true })
  fs.writeFileSync(file, JSON.stringify(messages))
}

function isSpoolMessage(value: unknown): value is SpoolMessage {
  if (!value || typeof value !== "object") return false
  const message = value as SpoolMessage
  return typeof message.id === "string" && typeof message.from === "string" && typeof message.body === "string" && Array.isArray(message.mediaUrls)
}
