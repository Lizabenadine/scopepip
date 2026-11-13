import { authSecret } from "../../../../../lib/auth/directory.ts"
import { sessionFromRequest } from "../../../../../lib/auth/request.ts"
import { buildFacebookOAuthUrl, facebookOAuthConfig } from "../../../../../lib/facebook/credentials.ts"
import { planHasFeatureAccess } from "../../../../../lib/billing/entitlement.ts"
import crypto from "node:crypto"

export const runtime = "nodejs"

function signState(companyId: string): string {
  const payload = Buffer.from(JSON.stringify({ companyId, ts: Date.now() })).toString("base64url")
  const sig = crypto.createHmac("sha256", authSecret()).update(payload).digest("base64url")
  return `${payload}.${sig}`
}

export async function GET(request: Request) {
  const session = await sessionFromRequest(request)
  const url = new URL(request.url)

  if (!session) {
    return Response.redirect(new URL("/login", url.origin).toString())
  }

  const access = planHasFeatureAccess(session.planTier, "facebookMessenger", session.subscriptionStatus)
  if (!access.allowed) {
    return Response.redirect(
      new URL("/settings?tab=integrations&facebook_error=business_plan_required", url.origin).toString(),
    )
  }

  const { configured } = facebookOAuthConfig()
  if (!configured) {
    return Response.redirect(new URL("/settings?tab=integrations&facebook_error=missing_app_id", url.origin).toString())
  }

  const redirectUri = `${url.origin}/api/facebook/oauth/callback`
  const state = signState(session.companyId)
  const oauthUrl = buildFacebookOAuthUrl(redirectUri, state)

  if (!oauthUrl) {
    return Response.redirect(new URL("/settings?tab=integrations&facebook_error=invalid_config", url.origin).toString())
  }

  return Response.redirect(oauthUrl)
}
