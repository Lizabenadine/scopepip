import { readCompanyBook } from "../../../../lib/auth/directory.ts"
import { sessionFromRequest } from "../../../../lib/auth/request.ts"
import { getDecryptedCompanyCamToken, syncCompanyCamWithToken } from "../../../../lib/companycam/api.ts"

export const runtime = "nodejs"

export async function POST(request: Request) {
  try {
    const session = await sessionFromRequest(request)
    if (!session) return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 })

    const book = await readCompanyBook(session.companyId)
    if (!book) {
      return Response.json({ connected: false, detail: "Contractor account not found.", jobs: [] }, { status: 404 })
    }

    const token = await getDecryptedCompanyCamToken(session.companyId)
    if (!token) {
      return Response.json({ connected: false, detail: "Job photos are not connected.", jobs: [] })
    }

    const body = await request.json().catch(() => null)
    const rows =
      body && typeof body === "object" && Array.isArray((body as { jobs?: unknown }).jobs)
        ? (body as { jobs: unknown[] }).jobs
        : []
    const rawJobs = rows
      .map(jobOf)
      .filter((job): job is { estimateId: string; address: string; title: string; projectId?: string } => job !== null)

    // Enforce cross-contractor isolation: only jobs belonging to this contractor's company are processed
    const validEstimateIds = new Set(book.state.estimates.map((item) => item.id))
    const authorizedJobs = rawJobs.filter((job) => validEstimateIds.has(job.estimateId))

    if (authorizedJobs.length === 0 && rawJobs.length > 0) {
      return Response.json({ connected: true, detail: "No authorized jobs matched.", jobs: [] })
    }

    const result = await syncCompanyCamWithToken(token, authorizedJobs)
    return Response.json(result)
  } catch {
    return Response.json({ connected: false, detail: "Job photos could not be reached.", jobs: [] })
  }
}

function jobOf(value: unknown): { estimateId: string; address: string; title: string; projectId?: string } | null {
  if (!value || typeof value !== "object") return null
  const job = value as Record<string, unknown>
  if (typeof job.estimateId !== "string" || typeof job.address !== "string" || typeof job.title !== "string") return null
  return {
    estimateId: job.estimateId,
    address: job.address,
    title: job.title,
    projectId: typeof job.projectId === "string" ? job.projectId : undefined,
  }
}
