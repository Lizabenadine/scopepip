import {
  matchCompanyCamProject,
  parseCompanyCamPhotos,
  parseCompanyCamProjects,
  type CompanyCamPhoto,
  type CompanyCamProject,
} from "./match.ts"
import {
  clearCompanyCamCredentials,
  getCompanyCamStatus,
  getDecryptedCompanyCamToken,
  writeCompanyCamCredentials,
  type CompanyCamStatus,
} from "./credentials.ts"

export type { CompanyCamStatus }
export { clearCompanyCamCredentials, getCompanyCamStatus, getDecryptedCompanyCamToken, writeCompanyCamCredentials }

export interface CompanyCamJobResult {
  estimateId: string
  matched: boolean
  projectId?: string
  projectName?: string
  projectUrl?: string
  photos: CompanyCamPhoto[]
  detail: string
}

export async function verifyCompanyCamToken(token: string): Promise<{ ok: boolean; reason?: string }> {
  const trimmed = token.trim()
  if (!trimmed || trimmed.length < 15) {
    return { ok: false, reason: "Please enter a valid CompanyCam API token." }
  }
  try {
    const response = await fetch("https://api.companycam.com/v2/users/current", {
      method: "GET",
      headers: { authorization: `Bearer ${trimmed}`, accept: "application/json" },
    })
    if (response.status === 401 || response.status === 403) {
      return { ok: false, reason: "The photo token was rejected by CompanyCam." }
    }
    if (!response.ok) {
      return { ok: false, reason: `CompanyCam could not be reached (${response.status}).` }
    }
    return { ok: true }
  } catch (error) {
    const detail = error instanceof Error ? error.message : "CompanyCam could not be reached."
    return { ok: false, reason: detail }
  }
}

export async function companyCamStatus(companyId?: string): Promise<{ connected: boolean; last4: string; verifiedAt?: string }> {
  if (!companyId) return { connected: false, last4: "" }
  return getCompanyCamStatus(companyId)
}

export async function syncCompanyCam(
  companyIdOrJobs: string | { estimateId: string; address: string; title: string; projectId?: string }[],
  maybeJobs?: { estimateId: string; address: string; title: string; projectId?: string }[],
): Promise<{ connected: boolean; detail: string; jobs: CompanyCamJobResult[] }> {
  let companyId = ""
  let jobs: { estimateId: string; address: string; title: string; projectId?: string }[] = []

  if (typeof companyIdOrJobs === "string") {
    companyId = companyIdOrJobs
    jobs = Array.isArray(maybeJobs) ? maybeJobs : []
  } else if (Array.isArray(companyIdOrJobs)) {
    jobs = companyIdOrJobs
  }

  if (!companyId) {
    return { connected: false, detail: "Job photos are not connected.", jobs: [] }
  }

  const token = await getDecryptedCompanyCamToken(companyId)
  if (!token || token.length < 15) {
    return { connected: false, detail: "Job photos are not connected.", jobs: [] }
  }

  return syncCompanyCamWithToken(token, jobs)
}

export async function syncCompanyCamWithToken(
  token: string,
  jobs: { estimateId: string; address: string; title: string; projectId?: string }[],
): Promise<{ connected: boolean; detail: string; jobs: CompanyCamJobResult[] }> {
  const trimmed = token.trim()
  if (!trimmed || trimmed.length < 15) {
    return { connected: false, detail: "Job photos are not connected.", jobs: [] }
  }
  try {
    const projects = parseCompanyCamProjects(await companyCam(trimmed, "/projects?per_page=50"))
    const results: CompanyCamJobResult[] = []
    for (const job of jobs.slice(0, 8)) {
      const project = matchCompanyCamProject(job, projects)
      if (!project) {
        results.push({
          estimateId: job.estimateId,
          matched: false,
          photos: [],
          detail: "No photo project matches this address.",
        })
        continue
      }
      let photos: CompanyCamPhoto[] = []
      try {
        photos = parseCompanyCamPhotos(
          await companyCam(trimmed, `/projects/${encodeURIComponent(project.id)}/photos?per_page=12`),
        )
      } catch {
        photos = []
      }
      results.push({
        estimateId: job.estimateId,
        matched: true,
        projectId: project.id,
        projectName: project.name,
        projectUrl: project.projectUrl,
        photos: photos.slice(0, 12),
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
