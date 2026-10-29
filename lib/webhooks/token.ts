/** The secret in the lead webhook address. Anything else is refused. */
export function leadWebhookToken(value: string | undefined): string | null {
  const trimmed = value?.trim().toLowerCase() ?? ""
  if (!/^[a-f0-9]{32}$/.test(trimmed)) return null
  return trimmed
}
