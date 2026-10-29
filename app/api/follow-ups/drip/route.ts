import { sessionFromRequest } from "@/lib/auth/request"
import { runAllQuoteDrips } from "@/lib/follow-ups/drip-run"

export const runtime = "nodejs"

export async function GET(request: Request) {
  return run(request)
}

export async function POST(request: Request) {
  return run(request)
}

async function run(request: Request) {
  const session = await sessionFromRequest(request)
  const secret = process.env.CRON_SECRET?.trim()
  const cron = Boolean(secret && request.headers.get("authorization") === `Bearer ${secret}`)
  if (!session && !cron) return Response.json({ ok: false, reason: "Sign in first." }, { status: 401 })
  const delivered = await runAllQuoteDrips(new URL(request.url).origin, cron ? undefined : session?.companyId)
  return Response.json({ ok: true, delivered })
}
