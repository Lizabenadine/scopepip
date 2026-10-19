import { createClient, type SupabaseClient } from "@supabase/supabase-js"

const projectUrl = "https://kavebhnmcdeptnpdlotz.supabase.co"

export function supabaseProjectUrl(): string {
  const configured = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
  if (configured && /^https?:\/\//i.test(configured.trim())) return configured.trim()
  return projectUrl
}

export function supabaseServerKey(): string | null {
  const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
  const trimmed = key?.trim()
  return trimmed ? trimmed : null
}

export function supabaseAdmin(): SupabaseClient | null {
  const key = supabaseServerKey()
  if (!key) return null
  return createClient(supabaseProjectUrl(), key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { "User-Agent": "scopepipe-sync" } },
  })
}
