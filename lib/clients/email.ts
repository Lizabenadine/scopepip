export function normalizeClientEmail(email: string): string {
  return email.trim().toLowerCase()
}

export function clientByEmail<T extends { email: string }>(clients: T[], email: string): T | null {
  const key = normalizeClientEmail(email)
  if (!key.includes("@")) return null
  return clients.find((client) => normalizeClientEmail(client.email) === key) ?? null
}
