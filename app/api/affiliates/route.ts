import { cookies } from "next/headers"
import {
  AFFILIATE_COOKIE,
  getAffiliateDashboardData,
  loginAffiliate,
  markCommissionPaid,
  readAffiliateSession,
  registerAffiliate,
  signAffiliateSession,
} from "../../../lib/affiliates/affiliate-store.ts"

export const runtime = "nodejs"

export async function GET(request: Request) {
  const cookieStore = await cookies()
  const token = cookieStore.get(AFFILIATE_COOKIE)?.value
  const affiliateId = readAffiliateSession(token)

  if (!affiliateId) {
    return Response.json({ ok: false, authenticated: false }, { status: 401 })
  }

  const data = await getAffiliateDashboardData(affiliateId)
  if (!data) {
    return Response.json({ ok: false, authenticated: false }, { status: 401 })
  }

  return Response.json({ ok: true, authenticated: true, ...data })
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>
    const action = typeof body.action === "string" ? body.action : "login"

    if (action === "logout") {
      const cookieStore = await cookies()
      cookieStore.delete(AFFILIATE_COOKIE)
      return Response.json({ ok: true })
    }

    if (action === "register") {
      const name = typeof body.name === "string" ? body.name : ""
      const email = typeof body.email === "string" ? body.email : ""
      const password = typeof body.password === "string" ? body.password : ""
      const payoutMethod =
        body.payoutMethod === "wise" || body.payoutMethod === "ach" ? body.payoutMethod : "paypal"
      const payoutEmail = typeof body.payoutEmail === "string" ? body.payoutEmail : email
      const customCode = typeof body.customCode === "string" ? body.customCode : undefined

      const result = await registerAffiliate({
        name,
        email,
        password,
        payoutMethod,
        payoutEmail,
        customCode,
      })

      if (!result.ok) {
        return Response.json({ ok: false, reason: result.reason }, { status: 400 })
      }

      const token = signAffiliateSession(result.affiliate.id)
      const cookieStore = await cookies()
      cookieStore.set(AFFILIATE_COOKIE, token, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production" || Boolean(process.env.VERCEL),
        maxAge: 30 * 24 * 60 * 60,
        path: "/",
      })

      return Response.json({ ok: true, affiliate: result.affiliate })
    }

    if (action === "login") {
      const email = typeof body.email === "string" ? body.email : ""
      const password = typeof body.password === "string" ? body.password : ""

      const result = await loginAffiliate(email, password)
      if (!result.ok) {
        return Response.json({ ok: false, reason: result.reason }, { status: 401 })
      }

      const token = signAffiliateSession(result.affiliate.id)
      const cookieStore = await cookies()
      cookieStore.set(AFFILIATE_COOKIE, token, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production" || Boolean(process.env.VERCEL),
        maxAge: 30 * 24 * 60 * 60,
        path: "/",
      })

      return Response.json({ ok: true, affiliate: result.affiliate })
    }

    if (action === "admin_payout") {
      const commissionId = typeof body.commissionId === "string" ? body.commissionId : ""
      if (!commissionId) {
        return Response.json({ ok: false, reason: "Commission ID required" }, { status: 400 })
      }
      const success = await markCommissionPaid(commissionId)
      return Response.json({ ok: success })
    }

    return Response.json({ ok: false, reason: "Unknown action" }, { status: 400 })
  } catch (error) {
    const reason = error instanceof Error ? error.message : "Affiliate request failed"
    return Response.json({ ok: false, reason }, { status: 500 })
  }
}
