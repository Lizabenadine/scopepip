import { sessionFromRequest } from "@/lib/auth/request"

export const runtime = "nodejs"

export function GET(request: Request) {
  return Response.json({ user: sessionFromRequest(request) })
}
