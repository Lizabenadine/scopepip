import { createClient, type SupabaseClient } from "@supabase/supabase-js"

import { readSendKeys } from "../messaging/keys.ts"

const projectUrl = "https://kavebhnmcdeptnpdlotz.supabase.co"

export function supabaseProjectUrl(): string {
  const configured = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
  if (configured && /^https?:\/\//i.test(configured.trim())) return configured.trim()
  return projectUrl
}

export function supabaseServerKey(): string | null {
  const saved = readSendKeys().supabaseSecret.trim()
  return saved || null
}

export function supabaseAdmin(): SupabaseClient | null {
  const key = supabaseServerKey()
  if (!key) return null
  return createClient(supabaseProjectUrl(), key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { "User-Agent": "scopepipe-sync" } },
  })
}
