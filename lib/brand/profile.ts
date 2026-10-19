import type { EstimateSettings } from "../types.ts"

function configured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
}

async function client() {
  const { createClient } = await import("@/lib/supabase/client")
  return createClient()
}

export interface CompanyProfile {
  companyName: string
  companyEmail: string
}

/** Signed-in org profile. Null when Supabase or a session is not available. */
export async function readCompanyProfile(): Promise<CompanyProfile | null> {
  if (!configured()) return null
  try {
    const supabase = await client()
    const { data: session } = await supabase.auth.getSession()
    const userId = session.session?.user.id
    if (!userId) return null
    const { data, error } = await supabase
      .from("profiles")
      .select("company_name, company_email")
      .eq("user_id", userId)
      .maybeSingle()
    if (error || !data) return null
    return {
      companyName: typeof data.company_name === "string" ? data.company_name : "",
      companyEmail: typeof data.company_email === "string" ? data.company_email : "",
    }
  } catch {
    return null
  }
}

export async function saveCompanyProfile(settings: EstimateSettings): Promise<void> {
  if (!configured()) return
  try {
    const supabase = await client()
    const { data: session } = await supabase.auth.getSession()
    const userId = session.session?.user.id
    if (!userId) return
    await supabase.from("profiles").upsert({
      user_id: userId,
      company_name: settings.companyName?.trim() ?? "",
      company_email: settings.companyEmail?.trim() ?? "",
      updated_at: new Date().toISOString(),
    })
  } catch {
    // Local settings remain the source until the profile write succeeds.
  }
}

/** Company on a public proposal, from the estimate owner's profile. Null if unknown. */
export async function readProposalCompanyName(token: string): Promise<string | null> {
  if (!configured() || !token) return null
  try {
    const supabase = await client()
    const { data, error } = await supabase.rpc("proposal_company_name", { proposal_token: token })
    if (error || typeof data !== "string") return null
    return data
  } catch {
    return null
  }
}
