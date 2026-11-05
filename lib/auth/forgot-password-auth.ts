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
