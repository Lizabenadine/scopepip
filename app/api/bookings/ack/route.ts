import { ackBookingSpool } from "@/lib/bookings/spool"

export const runtime = "nodejs"

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  const ids =
    body && typeof body === "object" && Array.isArray((body as { ids?: unknown }).ids)
      ? (body as { ids: unknown[] }).ids.filter((id): id is string => typeof id === "string").slice(0, 100)
      : []
  ackBookingSpool(ids)
  return Response.json({ ok: true })
}
