import type { ChangeOrder } from "../types.ts"

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export async function syncChangeOrder(changeOrder: ChangeOrder): Promise<void> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) return
  if (!UUID_PATTERN.test(changeOrder.estimateId)) return
  const { createClient } = await import("@supabase/supabase-js")
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  )
  const { data: session } = await supabase.auth.getSession()
  const userId = session.session?.user.id
  if (!userId) return
  const { error } = await supabase.from("change_orders").insert({
    id: changeOrder.id,
    estimate_id: changeOrder.estimateId,
    user_id: userId,
    items: changeOrder.items,
    subtotal: changeOrder.subtotal,
    client_signature_url: changeOrder.clientSignatureUrl,
    created_at: changeOrder.createdAt,
  })
  if (error) throw new Error(error.message)
}
