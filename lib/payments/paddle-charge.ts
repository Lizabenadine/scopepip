export function paddleApiBase(mode: "live" | "sandbox"): string {
  return mode === "live" ? "https://api.paddle.com" : "https://sandbox-api.paddle.com"
}

export function paddleTransactionBody(estimateId: string, amountCents: number, description: string) {
  return {
    custom_data: { estimateId },
    items: [
      {
        quantity: 1,
        price: {
          description,
          tax_mode: "account_setting" as const,
          unit_price: { amount: String(amountCents), currency_code: "USD" as const },
          product: { name: "Job deposit", tax_category: "standard", description },
        },
      },
    ],
  }
}

export function paddlePaidDeposit(payload: unknown, estimateId: string, amountCents: number): string | null {
  const body = unwrap(payload)
  if (!body?.id || (body.status !== "paid" && body.status !== "completed")) return null
  if (body.custom_data?.estimateId !== estimateId) return null
  const amount = body.items?.[0]?.price?.unit_price?.amount
  if (amount !== String(amountCents)) return null
  return body.id
}

function unwrap(payload: unknown): {
  id?: string
  status?: string
  custom_data?: { estimateId?: string }
  items?: { price?: { unit_price?: { amount?: string } } }[]
} | null {
  if (!payload || typeof payload !== "object") return null
  const record = payload as { data?: unknown }
  const body = record.data && typeof record.data === "object" ? record.data : payload
  return body as {
    id?: string
    status?: string
    custom_data?: { estimateId?: string }
    items?: { price?: { unit_price?: { amount?: string } } }[]
  }
}
