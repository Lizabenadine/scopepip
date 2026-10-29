import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"
import { supabaseAuthConfigured, supabaseBrowserUrl, supabasePublishableKey } from "./env"

export async function updateSession(request: NextRequest) {
  const hasAuthCookie = request.cookies.getAll().some((cookie) => cookie.name.startsWith("sb-"))
  if (!supabaseAuthConfigured() || !hasAuthCookie) return NextResponse.next({ request })

  let supabaseResponse = NextResponse.next({ request })
  const supabase = createServerClient(supabaseBrowserUrl(), supabasePublishableKey(), {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
        supabaseResponse = NextResponse.next({ request })
        cookiesToSet.forEach(({ name, value, options }) => supabaseResponse.cookies.set(name, value, options))
        Object.entries(headers).forEach(([key, value]) => supabaseResponse.headers.set(key, value))
      },
    },
  })

  try {
    await supabase.auth.getClaims()
  } catch {
    return supabaseResponse
  }

  // Return the response setAll last built. An earlier response drops the refreshed token.
  return supabaseResponse
}
