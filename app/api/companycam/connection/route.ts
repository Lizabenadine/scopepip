import { companyCamStatus, saveCompanyCamToken } from "@/lib/companycam/api"

export const runtime = "nodejs"

export function GET() {
  return Response.json(companyCamStatus())
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null)
    const token = body && typeof body === "object" && typeof (body as { token?: unknown }).token === "string"
      ? (body as { token: string }).token
      : ""
    return Response.json(saveCompanyCamToken(token))
  } catch {
    return Response.json({ connected: false, last4: "" })
  }
}
