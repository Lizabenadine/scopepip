import { laborPaymentSchedule } from "@/lib/payments/schedule"

export const runtime = "nodejs"

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null)
    if (!body || typeof body !== "object") {
      return Response.json({ error: "surfaces array required" }, { status: 400 })
    }
    const record = body as {
      surfaces?: unknown
      hourlyRate?: unknown
      depositPct?: unknown
      progressPct?: unknown
      completionPct?: unknown
    }
    const result = laborPaymentSchedule({
      surfaces: record.surfaces,
      hourlyRate: record.hourlyRate,
      depositPct: record.depositPct,
      progressPct: record.progressPct,
      completionPct: record.completionPct,
    })
    if (!result.ok) return Response.json({ error: result.error }, { status: 400 })
    return Response.json(result.schedule)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not build the payment schedule."
    return Response.json({ error: message }, { status: 500 })
  }
}
