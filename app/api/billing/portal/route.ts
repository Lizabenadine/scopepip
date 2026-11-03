import { sessionFromRequest } from "@/lib/auth/request"
import { customerIdForEmail, subscriptionIdsForCustomer } from "@/lib/billing/paddle-mirror"
import { customerPortalUrl } from "@/lib/billing/paddle-server"


export const runtime = "nodejs"

export async function POST(request: Request) {
  const session = await sessionFromRequest(request)
  if (!session) return Response.json({ reason: "Sign in before opening billing." }, { status: 401 })
  try {
    const customerId = await customerIdForEmail(session.email)
    if (!customerId) {
      return Response.json({ reason: "No Paddle customer is linked to this account yet." }, { status: 404 })
    }
    const subscriptionIds = await subscriptionIdsForCustomer(customerId)
    const url = await customerPortalUrl(customerId, subscriptionIds)
    return Response.redirect(url, 303)
  } catch (error) {
    const message = error instanceof Error ? error.message : ""
    const reason = message.startsWith("PADDLE_") ? message : "The billing portal could not be opened."
    return Response.json({ reason }, { status: 500 })
  }
}
