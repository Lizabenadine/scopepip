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

export function attachAuthCookies<T extends Response | NextResponse>(
  response: T,
  cookies: PendingAuthCookie[],
  headers: Record<string, string> = {},
): T {
  for (const cookie of cookies) {
    if ("cookies" in response && response.cookies && typeof (response.cookies as { set?: unknown }).set === "function") {
      response.cookies.set(cookie.name, cookie.value, cookie.options)
    } else {
      const parts = [`${cookie.name}=${cookie.value}`]
      if (cookie.options?.path) parts.push(`Path=${cookie.options.path}`)
      if (typeof cookie.options?.maxAge === "number") parts.push(`Max-Age=${cookie.options.maxAge}`)
      if (cookie.options?.httpOnly) parts.push("HttpOnly")
      if (cookie.options?.secure) parts.push("Secure")
      if (cookie.options?.sameSite) parts.push(`SameSite=${cookie.options.sameSite}`)
      response.headers.append("set-cookie", parts.join("; "))
    }
  }
  for (const [key, value] of Object.entries(headers)) response.headers.set(key, value)
  return response
}
