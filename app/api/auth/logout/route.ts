import { NextResponse, type NextRequest } from "next/server"
import { sessionCookie } from "@/lib/auth/session"
import { supabaseAuthConfigured } from "@/lib/supabase/env"
import { attachAuthCookies, authClientFromRequest } from "@/lib/supabase/pending-cookies"

export const runtime = "nodejs"

export async function POST(request: NextRequest) {
  const response = NextResponse.json({ ok: true })
  response.headers.append("set-cookie", sessionCookie("", 0))
  if (!supabaseAuthConfigured()) return response
  const pending = authClientFromRequest(request)
  await pending.supabase.auth.signOut().catch(() => undefined)
  return attachAuthCookies(response, pending.pending, pending.cacheHeaders)
}
