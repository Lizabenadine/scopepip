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
  domain?: string,
): T {
  for (const cookie of cookies) {
    const options = { ...cookie.options }
    if (domain) options.domain = domain
    if (process.env.NODE_ENV === "production" || Boolean(process.env.VERCEL)) {
      options.secure = true
    }
    if ("cookies" in response && response.cookies && typeof (response.cookies as { set?: unknown }).set === "function") {
      response.cookies.set(cookie.name, cookie.value, options)
    } else {
      const parts = [`${cookie.name}=${cookie.value}`]
      if (options?.path) parts.push(`Path=${options.path}`)
      if (typeof options?.maxAge === "number") parts.push(`Max-Age=${options.maxAge}`)
      if (options?.httpOnly) parts.push("HttpOnly")
      if (options?.secure) parts.push("Secure")
      if (options?.sameSite) parts.push(`SameSite=${options.sameSite}`)
      if (options?.domain) parts.push(`Domain=${options.domain}`)
      response.headers.append("set-cookie", parts.join("; "))
    }
  }
  for (const [key, value] of Object.entries(headers)) response.headers.set(key, value)
  return response
}
