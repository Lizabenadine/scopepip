export type ForgotPasswordOutcome =
  | { kind: "unconfigured" }
  | { kind: "success" }
  | { kind: "rate_limit"; reason: string }
  | { kind: "error"; reason: string }

export function interpretForgotPassword({
  configured,
  error,
}: {
  configured: boolean
  error: { message?: string; status?: number; code?: string } | null
}): ForgotPasswordOutcome {
  if (!configured) return { kind: "unconfigured" }
  if (!error) return { kind: "success" }

  const msg = (error.message || "").toLowerCase()
  const code = (error.code || "").toLowerCase()

  // Keep account-existence private: if Supabase reports user not found, treat as success
  if (code === "user_not_found" || msg.includes("user not found")) {
    return { kind: "success" }
  }

  // Rate limiting (HTTP 429 or Supabase over_email_send_rate_limit)
  if (error.status === 429 || code.includes("rate_limit") || msg.includes("rate limit") || msg.includes("too many")) {
    return { kind: "rate_limit", reason: "Too many requests. Please wait a minute before trying again." }
  }

  // Email delivery / SMTP / Server errors
  if (error.status === 500 || msg.includes("error sending") || msg.includes("mail") || msg.includes("smtp")) {
    return { kind: "error", reason: "We could not send the reset email right now. Please try again later." }
  }

  return { kind: "error", reason: "Could not send reset email. Please try again later." }
}

export function recoveryRedirectUrl(host: string, requestOrigin: string): string {
  const isLocal = host.includes("localhost") || host.includes("127.0.0.1")
  if (isLocal) {
    return `${requestOrigin.replace(/\/$/, "")}/reset-password`
  }
  // Supabase Site URL is configured as https://scopepipe.com (apex).
  // Using https://scopepipe.com/reset-password guarantees Supabase accepts
  // the redirect without discarding the path to the root homepage.
  return "https://scopepipe.com/reset-password"
}

export function canonicalResetPasswordUrl(requestUrl: string): URL {
  const url = new URL("/reset-password", requestUrl)
  if (url.hostname === "scopepipe.com") {
    url.hostname = "www.scopepipe.com"
  }
  return url
}

export function isRecoveryHashOrQuery({
  hash = "",
  search = "",
}: {
  hash?: string
  search?: string
}): boolean {
  const h = hash.replace(/^#/, "")
  const s = search.replace(/^\?/, "")
  const hParams = new URLSearchParams(h)
  const sParams = new URLSearchParams(s)

  return Boolean(
    hParams.get("type") === "recovery" ||
      hParams.get("access_token") ||
      hParams.get("error_code") ||
      hParams.get("error") ||
      sParams.get("type") === "recovery" ||
      sParams.get("next") === "/reset-password" ||
      sParams.get("error_code") ||
      sParams.get("error"),
  )
}
