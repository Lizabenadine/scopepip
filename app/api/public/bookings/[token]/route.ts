import { publicBooking } from "@/lib/auth/directory"

export const runtime = "nodejs"

export async function GET(_request: Request, context: { params: Promise<{ token: string }> }) {
  const { token } = await context.params
  if (!/^[a-z0-9]{6,40}$/i.test(token)) return Response.json({ reason: "This booking link is not valid." }, { status: 404 })
  const view = await publicBooking(token)
  if (!view) return Response.json({ reason: "This booking link is not valid." }, { status: 404 })
  return Response.json(view)
}
