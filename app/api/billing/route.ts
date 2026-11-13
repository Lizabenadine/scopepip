import { sessionFromRequest } from "@/lib/auth/request"
import { subscriptionAllows } from "@/lib/billing/access"
import { subscriptionForSession } from "@/lib/billing/guard"
import { paddleCheckoutFromEnv } from "@/lib/billing/paddle-checkout"

export const runtime = "nodejs"

export async function GET(request: Request) {
  const session = await sessionFromRequest(request)
  if (!session) return Response.json({ reason: "Sign in before opening billing." }, { status: 401 })
  const access = await subscriptionForSession(session)
  const paddle = paddleCheckoutFromEnv({ ...access, planTier: session.planTier })
  return Response.json({
    status: access.status,
    trialEndsAt: access.trialEndsAt,
    allows: subscriptionAllows(access, Date.now()),
    planTier: session.planTier || "pro",
    extraSeats: session.extraSeats || 0,
    paddle,
  })
}
