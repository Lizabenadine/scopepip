import { Environment, Paddle } from "@paddle/paddle-node-sdk"

export type PaddleServerEnvironment = "live" | "sandbox"

export function paddleServerEnvironment(env: Record<string, string | undefined> = process.env): PaddleServerEnvironment {
  const raw = env.PADDLE_ENV?.trim()
  if (raw !== "live" && raw !== "sandbox") {
    throw new Error("PADDLE_ENV must be live or sandbox.")
  }
  return raw
}

export function paddleApiKey(env: Record<string, string | undefined> = process.env): string {
  const key = env.PADDLE_API_KEY?.trim() ?? ""
  if (!key) throw new Error("PADDLE_API_KEY is not set.")
  return key
}

export function paddleServer(env: Record<string, string | undefined> = process.env): Paddle {
  const name = paddleServerEnvironment(env)
  return new Paddle(paddleApiKey(env), {
    environment: name === "live" ? Environment.production : Environment.sandbox,
  })
}

/** Verifies with the notification signing secret. The API key is not the secret. */
export async function verifyPaddleWebhook(
  rawBody: string,
  signature: string,
  secret: string,
  environment: PaddleServerEnvironment,
) {
  const paddle = new Paddle(process.env.PADDLE_API_KEY?.trim() || "", {
    environment: environment === "live" ? Environment.production : Environment.sandbox,
  })
  return paddle.webhooks.unmarshal(rawBody, secret, signature)
}

export async function customerPortalUrl(customerId: string, subscriptionIds: string[]): Promise<string> {
  const session = await paddleServer().customerPortalSessions.create(customerId, subscriptionIds)
  const overview = session.urls.general.overview
  if (!overview.startsWith("https://")) throw new Error("Paddle did not return a portal URL.")
  return overview
}
