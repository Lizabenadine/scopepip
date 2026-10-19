import type { DepositReceipt } from "../types.ts"

export async function syncDeposit(estimateId: string, receipt: DepositReceipt): Promise<void> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) return
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(estimateId)) return
  const { createClient } = await import("@supabase/supabase-js")
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  )
  const { error } = await supabase.rpc("record_deposit", {
    target_estimate_id: estimateId,
    payment_intent_id: receipt.paymentIntentId,
    amount: receipt.amount,
    deposit_percent: receipt.depositPercent,
    method: receipt.method,
    paid_at: receipt.paidAt,
  })
  if (error) throw new Error(error.message)
}
