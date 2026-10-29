import { sessionFromRequest } from "@/lib/auth/request"
import { subscriptionAllows } from "@/lib/billing/access"
import { configuredCheckoutBase, lemonCheckoutUrl } from "@/lib/billing/checkout"
import { subscriptionForSession } from "@/lib/billing/guard"

export const runtime = "nodejs"

export async function GET(request: Request) {
  const session = await sessionFromRequest(request)
  if (!session) return Response.json({ reason: "Sign in before opening billing." }, { status: 401 })
  const access = await subscriptionForSession(session)
  const checkoutUrl = lemonCheckoutUrl(configuredCheckoutBase(), access)
  return Response.json({
    status: access.status,
    trialEndsAt: access.trialEndsAt,
    allows: subscriptionAllows(access, Date.now()),
    checkoutUrl,
  })
}
