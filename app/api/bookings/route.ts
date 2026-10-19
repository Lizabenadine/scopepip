import { readBookingSpool } from "@/lib/bookings/spool"
import { acceptBooking } from "@/lib/bookings/receive"

export const runtime = "nodejs"

export function GET() {
  return Response.json({ bookings: readBookingSpool() })
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  const result = acceptBooking(body)
  if ("reason" in result) return Response.json({ ok: false, reason: result.reason }, { status: 400 })
  return Response.json({ ok: true, id: result.id, visitDay: result.visitDay, visitTime: result.visitTime })
}
