export function paypalApiBase(live: boolean): string {
  return live ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com"
}

export function paypalOrderBody(input: {
  estimateId: string
  amount: string
  returnUrl: string
  cancelUrl: string
}): {
  intent: "CAPTURE"
  purchase_units: { custom_id: string; amount: { currency_code: "USD"; value: string } }[]
  payment_source: {
    paypal: {
      experience_context: {
        return_url: string
        cancel_url: string
        user_action: "PAY_NOW"
        shipping_preference: "NO_SHIPPING"
      }
    }
  }
} {
  return {
    intent: "CAPTURE",
    purchase_units: [
      {
        custom_id: input.estimateId,
        amount: { currency_code: "USD", value: input.amount },
      },
    ],
    payment_source: {
      paypal: {
        experience_context: {
          return_url: input.returnUrl,
          cancel_url: input.cancelUrl,
          user_action: "PAY_NOW",
          shipping_preference: "NO_SHIPPING",
        },
      },
    },
  }
}

export function paypalApproveLink(links: { rel?: string; href?: string }[] | undefined): string | null {
  const link = links?.find((item) => item.rel === "payer-action" || item.rel === "approve")
  if (!link?.href?.startsWith("https://")) return null
  return link.href
}

export function paypalCaptureReceipt(
  order: unknown,
  estimateId: string,
  expectedAmount: string,
): { captureId: string; amount: number } | null {
  if (!order || typeof order !== "object") return null
  const body = order as {
    status?: string
    purchase_units?: {
      custom_id?: string
      payments?: { captures?: { id?: string; status?: string; amount?: { currency_code?: string; value?: string } }[] }
    }[]
  }
  if (body.status !== "COMPLETED") return null
  const unit = body.purchase_units?.[0]
  if (unit?.custom_id !== estimateId) return null
  const capture = unit.payments?.captures?.find((item) => item.status === "COMPLETED")
  if (!capture?.id || capture.amount?.currency_code !== "USD") return null
  const amount = Number(capture.amount.value)
  if (!Number.isFinite(amount) || amount.toFixed(2) !== expectedAmount) return null
  return { captureId: capture.id, amount }
}

export async function paypalAccessToken(input: {
  clientId: string
  secret: string
  live: boolean
}): Promise<string | null> {
  if (input.clientId.length < 20 || input.secret.length < 20) return null
  const response = await fetch(`${paypalApiBase(input.live)}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      authorization: `Basic ${Buffer.from(`${input.clientId}:${input.secret}`).toString("base64")}`,
      "content-type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  })
  if (!response.ok) return null
  const body = (await response.json().catch(() => null)) as { access_token?: string } | null
  return body?.access_token || null
}

export async function paypalCreateOrder(
  token: string,
  live: boolean,
  body: ReturnType<typeof paypalOrderBody>,
): Promise<{ approveUrl: string } | { error: string }> {
  const response = await fetch(`${paypalApiBase(live)}/v2/checkout/orders`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  })
  const payload = (await response.json().catch(() => null)) as { links?: { rel?: string; href?: string }[] } | null
  const approveUrl = paypalApproveLink(payload?.links)
  if (!response.ok || !approveUrl) return { error: "PayPal did not start the payment." }
  return { approveUrl }
}

export async function paypalCapturedOrder(
  token: string,
  live: boolean,
  orderId: string,
): Promise<unknown | null> {
  const response = await fetch(`${paypalApiBase(live)}/v2/checkout/orders/${encodeURIComponent(orderId)}/capture`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
    },
  })
  if (response.ok) return response.json().catch(() => null)
  const failed = (await response.json().catch(() => null)) as { name?: string } | null
  if (failed?.name !== "UNPROCESSABLE_ENTITY") return null
  const existing = await fetch(`${paypalApiBase(live)}/v2/checkout/orders/${encodeURIComponent(orderId)}`, {
    headers: { authorization: `Bearer ${token}` },
  })
  if (!existing.ok) return null
  return existing.json().catch(() => null)
}

