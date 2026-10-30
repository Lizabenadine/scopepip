import { sessionFromRequest } from "@/lib/auth/request"
import { sendWorkOrderOffer } from "@/lib/work-orders/offer-mail"

export const runtime = "nodejs"

export async function POST(request: Request) {
  const session = await sessionFromRequest(request)
  if (!session) return Response.json({ detail: "Sign in first." }, { status: 401 })
  const body = (await request.json().catch(() => null)) as {
    to?: unknown
    name?: unknown
    jobName?: unknown
    token?: unknown
  } | null
  const token = typeof body?.token === "string" ? body.token : ""
  const to = typeof body?.to === "string" ? body.to : ""
  const name = typeof body?.name === "string" ? body.name.trim() : ""
  const jobName = typeof body?.jobName === "string" ? body.jobName.trim() : ""
  if (!/^[a-f0-9]{12}$/.test(token) || !name || !jobName) {
    return Response.json({ detail: "This work order could not be sent." }, { status: 400 })
  }
  const origin = request.headers.get("origin")
  const link = origin ? `${origin.replace(/\/$/, "")}/w/${token}` : new URL(`/w/${token}`, request.url).toString()
  const result = await sendWorkOrderOffer({ to, name, jobName, link })
  const status = result.delivery === "failed" ? 400 : 200
  return Response.json({ delivery: result.delivery, detail: result.detail, link }, { status })
}
