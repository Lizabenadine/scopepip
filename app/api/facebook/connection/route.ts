import { sessionFromRequest } from "../../../../lib/auth/request.ts"
import {
  clearFacebookCredentials,
  facebookOAuthConfig,
  getDecryptedFacebookToken,
  getFacebookStatus,
  readFacebookCredentials,
  verifyFacebookPageToken,
  writeFacebookCredentials,
} from "../../../../lib/facebook/credentials.ts"

export const runtime = "nodejs"

export async function GET(request: Request) {
  const session = await sessionFromRequest(request)
  if (!session) return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 })
  const status = await getFacebookStatus(session.companyId)
  const { configured: oauthConfigured } = facebookOAuthConfig()
  return Response.json({ ...status, oauthConfigured })
}

export async function POST(request: Request) {
  const session = await sessionFromRequest(request)
  if (!session) return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 })

  try {
    const body = ((await request.json().catch(() => ({}))) || {}) as Record<string, unknown>
    const action = typeof body.action === "string" ? body.action : "connect"

    if (action === "disconnect") {
      await clearFacebookCredentials(session.companyId)
      return Response.json({ ok: true, connected: false })
    }

    if (action === "test") {
      const current = await readFacebookCredentials(session.companyId)
      if (!current || !current.connected) {
        return Response.json({ ok: false, reason: "No Facebook Page is currently connected." }, { status: 400 })
      }
      const token = await getDecryptedFacebookToken(session.companyId)
      if (!token) {
        return Response.json({ ok: false, reason: "Unable to retrieve token." }, { status: 400 })
      }
      const test = await verifyFacebookPageToken(current.pageId, token)
      if (!test.ok) {
        return Response.json({ ok: false, reason: test.reason || "The Page Access Token was rejected by Facebook." }, { status: 400 })
      }
      return Response.json({ ok: true, message: `Connected to ${test.pageName || current.pageName}.` })
    }

    // Default: "connect"
    const pageId = typeof body.pageId === "string" ? body.pageId.trim() : ""
    const pageAccessToken = typeof body.pageAccessToken === "string" ? body.pageAccessToken.trim() : ""

    if (!pageId) {
      return Response.json({ ok: false, reason: "Please enter your Facebook Page ID." }, { status: 400 })
    }
    if (!pageAccessToken || pageAccessToken.length < 15) {
      return Response.json({ ok: false, reason: "Please enter a valid Page Access Token." }, { status: 400 })
    }

    // Verify token with Meta Graph API
    const verified = await verifyFacebookPageToken(pageId, pageAccessToken)
    if (!verified.ok) {
      return Response.json(
        { ok: false, reason: verified.reason || "The Page Access Token was rejected by Facebook." },
        { status: 400 },
      )
    }

    const saved = await writeFacebookCredentials(session.companyId, {
      pageId,
      pageName: verified.pageName,
      pageAccessToken,
    })

    return Response.json({
      ok: true,
      connected: true,
      pageId: saved.pageId,
      pageName: saved.pageName,
      verifiedAt: saved.verifiedAt,
    })
  } catch (error) {
    const reason = error instanceof Error ? error.message : "Facebook connection could not be saved."
    return Response.json({ ok: false, reason }, { status: 500 })
  }
}
