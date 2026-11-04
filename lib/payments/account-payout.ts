import { companyIdForEstimate } from "../auth/directory.ts"
import { readPayout, type PayoutAccount } from "./payouts.ts"

export async function payoutForEstimate(estimateId: string): Promise<PayoutAccount | null> {
  const companyId = await companyIdForEstimate(estimateId)
  if (!companyId) return null
  return readPayout(companyId)
}
