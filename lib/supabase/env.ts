export function supabaseBrowserUrl(): string {
  return (process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "").trim()
}

export function supabasePublishableKey(): string {
  return (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "").trim()
}

export function supabaseAuthConfigured(): boolean {
  return Boolean(supabaseBrowserUrl() && supabasePublishableKey())
}
