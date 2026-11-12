import { proposalFigures } from "./figures.ts"
import type { Estimate, PaymentMethod } from "../types.ts"

const PROPOSAL_TOKEN_PATTERN = /^[a-z0-9_-]{6,64}$/i

/** Generates a 128-bit cryptographic URL-safe token never derived from an estimate ID. */
export function createProposalToken(): string {
  return crypto.randomUUID().replace(/-/g, "")
}

export function isProposalToken(value: unknown): value is string {
  return typeof value === "string" && PROPOSAL_TOKEN_PATTERN.test(value)
}

export interface ClientPaymentAvailability {
  enabled: boolean
  reason?: string
  total: number
  depositPercent: number
  depositAmount: number
}

/**
 * Authorizes whether a client holding a proposal token may initiate an online deposit payment
 * and returns the server-computed deposit figure from the saved estimate.
 */
export function clientPaymentAvailability(
  estimate: Estimate,
  paymentMethods: PaymentMethod[],
): ClientPaymentAvailability {
  const chosenLineIds = estimate.signature?.selectedLineIds ?? []
  const figures = proposalFigures(estimate, paymentMethods, chosenLineIds)
  if (estimate.clientStatus !== "accepted" || !estimate.signature) {
    return {
      enabled: false,
      reason: "Accept and sign the proposal before paying a deposit.",
      total: figures.quote.total,
      depositPercent: figures.depositPercent,
      depositAmount: figures.deposit,
    }
  }
  if (estimate.paymentStatus === "paid") {
    return {
      enabled: false,
      reason: "This balance has already been paid.",
      total: figures.quote.total,
      depositPercent: figures.depositPercent,
      depositAmount: 0,
    }
  }
  if (estimate.paymentStatus === "deposit_paid" && estimate.depositReceipt) {
    return {
      enabled: false,
      reason: "The deposit has already been paid.",
      total: figures.quote.total,
      depositPercent: figures.depositPercent,
      depositAmount: 0,
    }
  }
  if (figures.deposit <= 0) {
    return {
      enabled: false,
      reason: "Online deposit payment is not required for this proposal.",
      total: figures.quote.total,
      depositPercent: figures.depositPercent,
      depositAmount: 0,
    }
  }
  return {
    enabled: true,
    total: figures.quote.total,
    depositPercent: figures.depositPercent,
    depositAmount: figures.deposit,
  }
}
