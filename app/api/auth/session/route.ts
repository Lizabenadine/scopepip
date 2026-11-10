import { sessionFromRequest } from "@/lib/auth/request"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  return Response.json(
    { user: await sessionFromRequest(request) },
    {
      headers: {
        "Cache-Control": "private, no-cache, no-store, max-age=0, must-revalidate",
        Pragma: "no-cache",
      },
    },
  )
}
