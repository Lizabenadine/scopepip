import type { DepositMethod, DepositReceipt } from "../types.ts"

export function clampDepositPercent(value: number | null | undefined): number {
  const number = Number(value)
  if (!Number.isFinite(number)) return 30
  const clamped = Math.min(100, Math.max(0, number))
  return Math.round(clamped * 100) / 100
}

export function depositAmount(grandTotal: number, depositPercent: number): number {
  const total = Number.isFinite(grandTotal) ? Math.max(0, grandTotal) : 0
  const percent = Number.isFinite(depositPercent) ? depositPercent : 0
  const depositAmount = total * (percent / 100)
  return Math.round(depositAmount * 100) / 100
}

/** What the customer still owes after the deposit, from the proposal total. */
export function balanceAfterDeposit(grandTotal: number, depositPercent: number): number {
  const total = Number.isFinite(grandTotal) ? Math.max(0, grandTotal) : 0
  return Math.round((total - depositAmount(total, depositPercent)) * 100) / 100
}

export function depositCents(total: number, percent: number): number {
  return Math.round(depositAmount(total, percent) * 100)
}

export interface PaymentIntentPayload {
  id?: string
  amount?: number
  currency?: string
  metadata?: Record<string, string | undefined>
}

export function receiptFromPaymentIntent(
  intent: PaymentIntentPayload,
  paidAt: string,
): { estimateId: string; receipt: DepositReceipt } | null {
  const estimateId = intent.metadata?.estimateId?.trim() ?? ""
  const method = depositMethod(intent.metadata?.method)
  const amountCents = Number(intent.amount)
  if (!intent.id || !estimateId || !Number.isFinite(amountCents) || amountCents <= 0) return null
  return {
    estimateId,
    receipt: {
      paymentIntentId: intent.id,
      amount: Math.round(amountCents) / 100,
      currency: "usd",
      depositPercent: clampDepositPercent(Number(intent.metadata?.depositPercent)),
      method,
      paidAt,
    },
  }
}

export function depositMethod(value: string | undefined): DepositMethod {
  if (value === "apple_pay" || value === "google_pay") return value
  return "card"
}
