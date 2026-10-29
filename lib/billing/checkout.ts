/** Lemon Squeezy overlay link with the office account attached for the webhook. */
export function lemonCheckoutUrl(
  base: string,
  input: { userId: string; email: string; authUserId?: string },
): string | null {
  const trimmed = base.trim()
  let url: URL
  try {
    url = new URL(trimmed)
  } catch {
    return null
  }
  if (url.protocol !== "https:") return null
  const userId = (input.authUserId || input.userId).trim()
  const officeUserId = input.userId.trim()
  const email = input.email.trim()
  if (!userId || !email.includes("@")) return null
  const extra = [
    `checkout[email]=${encodeURIComponent(email)}`,
    `checkout[custom][user_id]=${encodeURIComponent(userId)}`,
    `checkout[custom][office_user_id]=${encodeURIComponent(officeUserId)}`,
  ].join("&")
  return `${url.origin}${url.pathname}${url.search}${url.search ? "&" : "?"}${extra}`
}

export function configuredCheckoutBase(): string {
  return process.env.NEXT_PUBLIC_LEMONSQUEEZY_CHECKOUT_URL?.trim() || ""
}
