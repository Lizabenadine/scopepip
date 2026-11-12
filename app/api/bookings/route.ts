import { publicBooking } from "@/lib/auth/directory"
import { sessionFromRequest } from "@/lib/auth/request"
import { readBookingSpool } from "@/lib/bookings/spool"
import { acceptBooking } from "@/lib/bookings/receive"
import { isProposalToken } from "@/lib/proposals/token"

export const runtime = "nodejs"

export async function GET(request: Request) {
  const session = await sessionFromRequest(request)
  if (!session) return Response.json({ reason: "Sign in first." }, { status: 401 })
  return Response.json({ bookings: readBookingSpool() })
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  const token =
    body && typeof body === "object" && isProposalToken((body as { token?: unknown }).token)
      ? (body as { token: string }).token
      : ""
  if (!token || !(await publicBooking(token))) {
    return Response.json({ ok: false, reason: "This booking link is not valid." }, { status: 404 })
  }
  const result = acceptBooking(body)
  if ("reason" in result) return Response.json({ ok: false, reason: result.reason }, { status: 400 })
  return Response.json({ ok: true, id: result.id, visitDay: result.visitDay, visitTime: result.visitTime })
}
