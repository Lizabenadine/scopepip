import { authSecret } from "../../../../../lib/auth/directory.ts"
import {
  exchangeFacebookCodeForPage,
  writeFacebookCredentials,
} from "../../../../../lib/facebook/credentials.ts"
import crypto from "node:crypto"

export const runtime = "nodejs"

function verifyState(rawState: string | null): { companyId: string } | null {
  if (!rawState) return null
  const parts = rawState.split(".")
  if (parts.length !== 2) return null
  const [payload, sig] = parts
  if (!payload || !sig) return null

  const expectedSig = crypto.createHmac("sha256", authSecret()).update(payload).digest("base64url")
  if (sig !== expectedSig) return null

  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf-8")) as { companyId?: string; ts?: number }
    if (typeof data.companyId !== "string" || !data.companyId) return null
    if (typeof data.ts === "number" && Date.now() - data.ts > 15 * 60 * 1000) {
      return null // Expired
    }
    return { companyId: data.companyId }
  } catch {
    return null
  }
}

export async function GET(request: Request) {
  const url = new URL(request.url)
  const code = url.searchParams.get("code")
  const state = url.searchParams.get("state")
  const error = url.searchParams.get("error")
  const errorDescription = url.searchParams.get("error_description") || url.searchParams.get("error_reason")

  if (error || !code) {
    const reason = errorDescription || error || "Authorization cancelled or declined."
    return Response.redirect(
      new URL(`/settings?tab=integrations&facebook_error=${encodeURIComponent(reason)}`, url.origin).toString(),
    )
  }

  const verified = verifyState(state)
  if (!verified) {
    return Response.redirect(
      new URL("/settings?tab=integrations&facebook_error=invalid_state", url.origin).toString(),
    )
  }

  const redirectUri = `${url.origin}/api/facebook/oauth/callback`
  const exchangeResult = await exchangeFacebookCodeForPage(code, redirectUri)

  if (!exchangeResult.ok) {
    return Response.redirect(
      new URL(
        `/settings?tab=integrations&facebook_error=${encodeURIComponent(exchangeResult.reason)}`,
        url.origin,
      ).toString(),
    )
  }

  await writeFacebookCredentials(verified.companyId, {
    pageId: exchangeResult.pageId,
    pageName: exchangeResult.pageName,
    pageAccessToken: exchangeResult.pageAccessToken,
  })

  return Response.redirect(new URL("/settings?tab=integrations&facebook=connected", url.origin).toString())
}
