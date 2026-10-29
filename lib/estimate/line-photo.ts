const PHOTO_LIMIT = 700_000

/** A proposal-line picture. Anything else is dropped before the customer sees it. */
export function linePhoto(src: string | undefined): string | undefined {
  if (!src) return undefined
  const value = src.trim()
  if (value.length === 0 || value.length > PHOTO_LIMIT) return undefined
  if (
    value.startsWith("data:image/jpeg;base64,") ||
    value.startsWith("data:image/png;base64,") ||
    value.startsWith("data:image/webp;base64,")
  ) {
    return value
  }
  if (value.startsWith("https://") && !/\s/.test(value)) return value
  return undefined
}
