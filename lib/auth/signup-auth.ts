export type SignupAuthOutcome =
  | { kind: "unconfigured" }
  | { kind: "session" }
  | { kind: "confirm" }
  | { kind: "exists" }
  | { kind: "error"; reason: string }

export function publicAuthReason(message: string): string {
  const text = message.toLowerCase()
  if (text.includes("rate limit")) return "Too many account emails were sent just now. Wait a minute and create the account again."
  if (text.includes("already registered") || text.includes("already been registered")) {
    return "That email already has an account."
  }
  if (text.includes("password") && (text.includes("short") || text.includes("at least") || text.includes("6 character"))) {
    return "Use at least 8 characters."
  }
  const clean = message.replace(/\s+/g, " ").trim()
  if (clean && clean.length < 180 && !/key|token|secret|jwt/i.test(clean)) return clean
  return "That account could not be created."
}

/** A session means email confirmation is off and the browser can stay signed in. */
export function interpretSignUp(input: {
  configured: boolean
  errorMessage: string | null
  hasSession: boolean
  hasUser: boolean
  identityCount: number | null
}): SignupAuthOutcome {
  if (!input.configured) return { kind: "unconfigured" }
  if (input.hasUser && input.identityCount === 0) return { kind: "exists" }
  if (input.errorMessage) return { kind: "error", reason: publicAuthReason(input.errorMessage) }
  if (input.hasSession) return { kind: "session" }
  if (input.hasUser) return { kind: "confirm" }
  return { kind: "error", reason: "That account could not be created." }
}
