export const DUPLICATE_ACCOUNT_EMAIL =
  "An account with this email already exists. Please sign in or reset your password."

/** Trim and lowercase so John@example.com and john@example.com are one address. */
export function normalizeAccountEmail(email: string): string {
  return email.trim().toLowerCase()
}

export function sameAccountEmail(left: string, right: string): boolean {
  const key = normalizeAccountEmail(left)
  return key.length > 0 && key === normalizeAccountEmail(right)
}

export function accountEmailTaken(users: { email: string }[], email: string): boolean {
  return users.some((user) => sameAccountEmail(user.email, email))
}

/** True when a save would add another account for an address that already has one. Existing duplicates are left in place. */
export function introducesDuplicateEmail(before: { email: string }[], after: { email: string }[]): boolean {
  const prior = emailCounts(before)
  const seen = new Map<string, number>()
  for (const user of after) {
    const key = normalizeAccountEmail(user.email)
    if (!key) continue
    const count = (seen.get(key) ?? 0) + 1
    seen.set(key, count)
    if (count > Math.max(prior.get(key) ?? 0, 1)) return true
  }
  return false
}

/** Lowercase an address when only one account uses it. Shared addresses stay unchanged so no account is removed. */
export function canonicalizeUniqueEmails<T extends { email: string }>(users: T[]): T[] {
  const counts = emailCounts(users)
  return users.map((user) => {
    const key = normalizeAccountEmail(user.email)
    if (!key || counts.get(key) !== 1 || user.email === key) return user
    return { ...user, email: key }
  })
}

function emailCounts(users: { email: string }[]): Map<string, number> {
  const counts = new Map<string, number>()
  for (const user of users) {
    const key = normalizeAccountEmail(user.email)
    if (!key) continue
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }
  return counts
}
