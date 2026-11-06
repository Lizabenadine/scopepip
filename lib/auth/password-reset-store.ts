import { createHmac, randomBytes, timingSafeEqual } from "node:crypto"
import { authSecret } from "./directory.ts"

export function createPasswordResetToken(email: string, accessToken?: string): string {
  const normalized = email.toLowerCase().trim()
  const exp = Date.now() + 60 * 60 * 1000 // 1 hour
  const payload = Buffer.from(
    JSON.stringify({
      email: normalized,
      ...(accessToken ? { accessToken } : {}),
      exp,
      salt: randomBytes(8).toString("hex"),
    }),
  ).toString("base64url")

  const hmac = createHmac("sha256", authSecret()).update(payload).digest("base64url")
  return `${payload}.${hmac}`
}

export function verifyPasswordResetToken(
  token: string,
): { valid: boolean; email?: string; accessToken?: string; reason?: string } {
  if (!token || typeof token !== "string" || !token.includes(".")) {
    return { valid: false, reason: "This reset link is invalid or malformed." }
  }

  const [payload, signature] = token.trim().split(".")
  if (!payload || !signature) {
    return { valid: false, reason: "This reset link is invalid or malformed." }
  }

  const expectedSignature = createHmac("sha256", authSecret()).update(payload).digest("base64url")
  if (
    signature.length !== expectedSignature.length ||
    !timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))
  ) {
    return { valid: false, reason: "This reset link is invalid or has been modified." }
  }

  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as {
      email?: string
      accessToken?: string
      exp?: number
    }

    if (!data.email || typeof data.exp !== "number") {
      return { valid: false, reason: "This reset link is invalid." }
    }

    if (Date.now() > data.exp) {
      return { valid: false, reason: "This reset link has expired. Please request a new one." }
    }

    return { valid: true, email: data.email, accessToken: data.accessToken }
  } catch {
    return { valid: false, reason: "This reset link is invalid." }
  }
}
