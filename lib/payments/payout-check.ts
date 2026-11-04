import { paddleApiBase } from "./paddle-charge.ts"
import { paddleKeyMode } from "./payouts.ts"

export async function stripeAccountAccepted(secret: string): Promise<boolean> {
  if (!secret.startsWith("sk_")) return false
  const response = await fetch("https://api.stripe.com/v1/account", {
    headers: { authorization: `Bearer ${secret}` },
  })
  return response.ok
}

export async function paddleAccountAccepted(apiKey: string): Promise<boolean> {
  const mode = paddleKeyMode(apiKey)
  if (!mode) return false
  const response = await fetch(`${paddleApiBase(mode)}/event-types`, {
    headers: { authorization: `Bearer ${apiKey}` },
  })
  return response.ok
}
