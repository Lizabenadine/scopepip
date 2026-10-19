import { sessionFromRequest } from "@/lib/auth/request"

export const runtime = "nodejs"

export async function GET(request: Request) {
  return Response.json({ user: await sessionFromRequest(request) })
}
