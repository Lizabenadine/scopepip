import fs from "node:fs"
import path from "node:path"
import {
  matchCompanyCamProject,
  parseCompanyCamPhotos,
  parseCompanyCamProjects,
  type CompanyCamPhoto,
  type CompanyCamProject,
} from "./match.ts"

export interface CompanyCamJobResult {
  estimateId: string
  matched: boolean
  projectId?: string
  projectName?: string
  projectUrl?: string
  photos: CompanyCamPhoto[]
  detail: string
}

function tokenFile(): string {
  return process.env.COMPANYCAM_TOKEN_PATH || path.join(process.cwd(), "data", "companycam.json")
}

export function companyCamToken(): string {
  const fromEnv = process.env.COMPANYCAM_API_TOKEN?.trim()
  if (fromEnv) return fromEnv
  try {
    const parsed = JSON.parse(fs.readFileSync(tokenFile(), "utf8")) as { token?: unknown }
    return typeof parsed.token === "string" ? parsed.token.trim() : ""
  } catch {
    return ""
  }
}

export function companyCamStatus(): { connected: boolean; last4: string } {
  const token = companyCamToken()
  return { connected: token.length >= 20, last4: token.length >= 4 ? token.slice(-4) : "" }
}

export function saveCompanyCamToken(token: string): { connected: boolean; last4: string } {
  const file = tokenFile()
  fs.mkdirSync(path.dirname(file), { recursive: true })
  const trimmed = token.trim()
  if (trimmed.length < 20) {
    fs.writeFileSync(file, JSON.stringify({ token: "" }))
    return { connected: false, last4: "" }
  }
  fs.writeFileSync(file, JSON.stringify({ token: trimmed.slice(0, 200) }))
  return companyCamStatus()
}

export async function syncCompanyCam(
  jobs: { estimateId: string; address: string; title: string; projectId?: string }[],
): Promise<{ connected: boolean; detail: string; jobs: CompanyCamJobResult[] }> {
  const token = companyCamToken()
  if (token.length < 20) {
    return { connected: false, detail: "Job photos are not connected.", jobs: [] }
  }
  try {
    const projects = parseCompanyCamProjects(await companyCam(token, "/projects?per_page=50"))
    const results: CompanyCamJobResult[] = []
    for (const job of jobs.slice(0, 8)) {
      const project = matchCompanyCamProject(job, projects)
      if (!project) {
        results.push({ estimateId: job.estimateId, matched: false, photos: [], detail: "No photo project matches this address." })
        continue
      }
      let photos: CompanyCamPhoto[] = []
      try {
        photos = parseCompanyCamPhotos(await companyCam(token, `/projects/${encodeURIComponent(project.id)}/photos?per_page=12`))
      } catch {
        photos = []
      }
      results.push({
        estimateId: job.estimateId,
        matched: true,
        projectId: project.id,
        projectName: project.name,
        projectUrl: project.projectUrl,
        photos,
        detail: photos.length > 0 ? `Synced ${photos.length} photos.` : "Project matched. No photos yet.",
      })
    }
    return { connected: true, detail: "Photos came back.", jobs: results }
  } catch (error) {
    const detail = error instanceof Error ? error.message : "Job photos could not be reached."
    return { connected: true, detail, jobs: [] }
  }
}

async function companyCam(token: string, pathName: string): Promise<unknown> {
  const response = await fetch(`https://api.companycam.com/v2${pathName}`, {
    headers: { authorization: `Bearer ${token}`, accept: "application/json" },
  })
  if (response.status === 401 || response.status === 403) throw new Error("The photo token was rejected.")
  if (!response.ok) throw new Error("Job photos could not be reached.")
  return response.json()
}
