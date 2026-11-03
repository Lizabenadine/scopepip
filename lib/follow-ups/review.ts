/** Keep only a full https review page. Anything else stays out of the customer message. */
export function reviewLink(value: string | null | undefined): string {
  const trimmed = value?.trim() ?? ""
  if (!/^https:\/\/\S+$/i.test(trimmed)) return ""
  return trimmed
}
