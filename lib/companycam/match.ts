import type { ScopeState } from "../data/seed.ts"

export interface CompanyCamProject {
  id: string
  name: string
  address: string
  projectUrl: string
}

export interface CompanyCamPhoto {
  id: string
  url: string
  capturedAt: string
}

const SKIP = new Set(["street", "st", "avenue", "ave", "road", "rd", "drive", "dr", "lane", "ln", "court", "ct", "boulevard", "blvd", "portland", "oregon", "suite", "unit"])

export function matchCompanyCamProject(
  job: { address: string; title: string; projectId?: string },
  projects: CompanyCamProject[],
): CompanyCamProject | null {
  if (job.projectId) {
    const chosen = projects.find((project) => project.id === job.projectId)
    if (chosen) return chosen
  }
  const needle = streetOf(job.address) ?? streetOf(job.title)
  if (!needle) return null
  return (
    projects.find((project) => {
      const hay = streetOf(`${project.address} ${project.name}`)
      return hay?.number === needle.number && hay.street === needle.street
    }) ?? null
  )
}

export function parseCompanyCamProjects(payload: unknown): CompanyCamProject[] {
  const rows = asRows(payload)
  const projects: CompanyCamProject[] = []
  for (const row of rows) {
    if (!row || typeof row !== "object") continue
    const project = row as Record<string, unknown>
    const id = stringOf(project.id)
    if (!id) continue
    const address = project.address && typeof project.address === "object" ? (project.address as Record<string, unknown>) : {}
    const street = [address.street_address_1, address.street_address_2, address.city, address.state, address.postal_code]
      .map(stringOf)
      .filter(Boolean)
      .join(" ")
    projects.push({
      id,
      name: stringOf(project.name),
      address: street,
      projectUrl: httpsOf(project.project_url) || httpsOf(project.public_url),
    })
  }
  return projects
}

export function parseCompanyCamPhotos(payload: unknown): CompanyCamPhoto[] {
  const photos: CompanyCamPhoto[] = []
  for (const row of asRows(payload)) {
    if (!row || typeof row !== "object") continue
    const photo = row as Record<string, unknown>
    const id = stringOf(photo.id)
    const url = photoUrl(photo)
    if (!id || !url) continue
    photos.push({ id, url, capturedAt: capturedAt(photo.captured_at ?? photo.created_at) })
  }
  return photos.slice(0, 12)
}

export function companyCamJobs(state: Pick<ScopeState, "estimates" | "workOrders">): { estimateId: string; address: string; title: string; projectId?: string }[] {
  const rank: Record<string, number> = { in_progress: 0, scheduled: 1, complete: 2 }
  return state.workOrders
    .filter((order) => order.status !== "unscheduled")
    .map((order) => ({ order, estimate: state.estimates.find((item) => item.id === order.estimateId) }))
    .filter((row) => row.estimate && (row.estimate.jobAddress || row.order.companyCamProjectId))
    .sort((left, right) => (rank[left.order.status] ?? 9) - (rank[right.order.status] ?? 9))
    .slice(0, 8)
    .map((row) => ({
      estimateId: row.estimate!.id,
      address: row.estimate!.jobAddress,
      title: row.estimate!.title,
      projectId: row.order.companyCamProjectId,
    }))
}

function streetOf(value: string): { number: string; street: string } | null {
  const tokens = value.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter(Boolean)
  const number = tokens.find((token) => /^\d{2,6}$/.test(token))
  if (!number) return null
  const street = tokens.slice(tokens.indexOf(number) + 1).find((token) => token.length > 2 && !SKIP.has(token))
  if (!street) return null
  return { number, street }
}

function asRows(payload: unknown): unknown[] {
  if (Array.isArray(payload)) return payload
  if (!payload || typeof payload !== "object") return []
  const record = payload as Record<string, unknown>
  for (const key of ["data", "projects", "photos", "results"]) {
    if (Array.isArray(record[key])) return record[key]
  }
  return []
}

function photoUrl(photo: Record<string, unknown>): string {
  const uris = Array.isArray(photo.uris) ? photo.uris : []
  const ranked = ["web", "thumbnail", "original"]
  for (const type of ranked) {
    const match = uris.find((item) => item && typeof item === "object" && (item as { type?: string }).type === type)
    const uri = match && typeof match === "object" ? httpsOf((match as { uri?: unknown }).uri) : ""
    if (uri) return uri
  }
  return httpsOf(photo.photo_url)
}

function capturedAt(value: unknown): string {
  const seconds = typeof value === "number" ? value : Number(value)
  if (!Number.isFinite(seconds) || seconds <= 0) return new Date(0).toISOString()
  return new Date(seconds > 10_000_000_000 ? seconds : seconds * 1000).toISOString()
}

function stringOf(value: unknown): string {
  if (typeof value === "string") return value.trim()
  if (typeof value === "number" && Number.isFinite(value)) return String(value)
  return ""
}

function httpsOf(value: unknown): string {
  const text = stringOf(value)
  if (!text.startsWith("https://")) return ""
  return text.slice(0, 500)
}
