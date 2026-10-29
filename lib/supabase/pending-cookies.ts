import { createServerClient, type CookieOptions } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"
import { supabaseBrowserUrl, supabasePublishableKey } from "./env"

export type PendingAuthCookie = { name: string; value: string; options: CookieOptions }

export function authClientFromRequest(request: NextRequest) {
  const pending: PendingAuthCookie[] = []
  const cacheHeaders: Record<string, string> = {}
  const supabase = createServerClient(supabaseBrowserUrl(), supabasePublishableKey(), {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet, headers) {
        pending.push(...cookiesToSet)
        Object.assign(cacheHeaders, headers)
      },
    },
  })
  return { supabase, pending, cacheHeaders }
}

export function attachAuthCookies(response: NextResponse, cookies: PendingAuthCookie[], headers: Record<string, string>) {
  for (const cookie of cookies) response.cookies.set(cookie.name, cookie.value, cookie.options)
  for (const [key, value] of Object.entries(headers)) response.headers.set(key, value)
  return response
}
