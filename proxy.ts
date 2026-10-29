import type { NextRequest } from "next/server"
import { billingRedirect } from "@/lib/billing/guard"
import { updateSession } from "@/lib/supabase/proxy"

export async function proxy(request: NextRequest) {
  const sessionResponse = await updateSession(request)
  const redirect = await billingRedirect(request)
  if (!redirect) return sessionResponse
  sessionResponse.cookies.getAll().forEach((cookie) => {
    redirect.cookies.set(cookie.name, cookie.value)
  })
  return redirect
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
}
