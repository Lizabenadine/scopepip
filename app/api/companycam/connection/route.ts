import { sessionFromRequest } from "../../../../lib/auth/request.ts"
import {
  clearCompanyCamCredentials,
  getCompanyCamStatus,
  getDecryptedCompanyCamToken,
  verifyCompanyCamToken,
  writeCompanyCamCredentials,
} from "../../../../lib/companycam/api.ts"

export const runtime = "nodejs"

export async function GET(request: Request) {
  const session = await sessionFromRequest(request)
  if (!session) return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 })
  const status = await getCompanyCamStatus(session.companyId)
  return Response.json(status)
}

export async function POST(request: Request) {
  const session = await sessionFromRequest(request)
  if (!session) return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 })

  try {
    const body = ((await request.json().catch(() => ({}))) || {}) as Record<string, unknown>
    const action = typeof body.action === "string" ? body.action : typeof body.token === "string" ? "save" : ""

    if (action === "disconnect") {
      await clearCompanyCamCredentials(session.companyId)
      return Response.json({ ok: true, connected: false, last4: "" })
    }

    if (action === "test") {
      let token = typeof body.token === "string" ? body.token.trim() : ""
      if (!token) {
        token = (await getDecryptedCompanyCamToken(session.companyId)) || ""
      }
      if (!token) {
        return Response.json({ ok: false, connected: false, reason: "No photo token is saved." }, { status: 400 })
      }
      const verification = await verifyCompanyCamToken(token)
      if (!verification.ok) {
        return Response.json(
          {
            ok: false,
            connected: false,
            reason: verification.reason || "The photo token was rejected by CompanyCam.",
          },
          { status: 400 },
        )
      }
      return Response.json({ ok: true, connected: true, message: "CompanyCam connection verified." })
    }

    // Default: "save"
    const token = typeof body.token === "string" ? body.token.trim() : ""
    if (!token || token.length < 15) {
      return Response.json(
        { ok: false, connected: false, reason: "Please enter a valid CompanyCam API token." },
        { status: 400 },
      )
    }

    const verification = await verifyCompanyCamToken(token)
    if (!verification.ok) {
      return Response.json(
        {
          ok: false,
          connected: false,
          reason: verification.reason || "The photo token was rejected by CompanyCam.",
        },
        { status: 400 },
      )
    }

    const saved = await writeCompanyCamCredentials(session.companyId, token)
    return Response.json({
      ok: true,
      connected: true,
      last4: saved.last4,
      verifiedAt: saved.verifiedAt,
    })
  } catch (error) {
    const reason = error instanceof Error ? error.message : "Job photos could not be saved."
    return Response.json({ ok: false, connected: false, reason }, { status: 500 })
  }
}
