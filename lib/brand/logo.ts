const LOGO_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"]
export const LOGO_BYTE_LIMIT = 2 * 1024 * 1024

/** A saved logo is an image address. Anything else stays off customer documents. */
export function displayLogoUrl(value: string | null | undefined): string | null {
  const trimmed = value?.trim() ?? ""
  if (!trimmed) return null
  if (/^data:image\/(png|jpeg|webp|gif);base64,/i.test(trimmed)) return trimmed
  try {
    const url = new URL(trimmed)
    if (url.protocol === "https:" || url.protocol === "http:") return trimmed
  } catch {
    return null
  }
  return null
}

export function logoFileError(file: { type: string; size: number }): string | null {
  if (!LOGO_TYPES.includes(file.type)) return "Use a PNG, JPG, WEBP, or GIF."
  if (file.size < 1) return "Choose an image."
  if (file.size > LOGO_BYTE_LIMIT) return "Use an image under 2 MB."
  return null
}
