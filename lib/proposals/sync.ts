import type { AcceptanceInput } from "./accept.ts"

export async function syncAcceptance(token: string, input: AcceptanceInput): Promise<void> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) return
  const { createClient } = await import("@supabase/supabase-js")
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  )
  const { error } = await supabase.rpc("accept_proposal", {
    proposal_token: token,
    signed_name: input.signedName,
    signature_payload: input.signaturePayload,
    signed_at: input.signedAt,
    selected_line_ids: input.selectedLineIds,
  })
  if (error) throw new Error(error.message)
}
