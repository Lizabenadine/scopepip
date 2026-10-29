import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { supabaseBrowserUrl, supabasePublishableKey } from "./env"

export async function createClient() {
  const cookieStore = await cookies()
  return createServerClient(supabaseBrowserUrl(), supabasePublishableKey(), {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
        } catch {
          // Server Components cannot write cookies. proxy.ts refreshes the session.
        }
      },
    },
  })
}
