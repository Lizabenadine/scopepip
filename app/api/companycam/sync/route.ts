import { syncCompanyCam } from "@/lib/companycam/api"

export const runtime = "nodejs"

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null)
    const rows = body && typeof body === "object" && Array.isArray((body as { jobs?: unknown }).jobs)
      ? (body as { jobs: unknown[] }).jobs
      : []
    const jobs = rows.map(jobOf).filter((job): job is { estimateId: string; address: string; title: string; projectId?: string } => job !== null)
    const result = await syncCompanyCam(jobs)
    return Response.json(result)
  } catch {
    return Response.json({ connected: false, detail: "CompanyCam could not be reached.", jobs: [] })
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
