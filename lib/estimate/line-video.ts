/** Supabase rejects an object over 50 MB. Stay under that so the upload can finish. */
export const LINE_VIDEO_BYTE_LIMIT = 40 * 1024 * 1024

const LOCAL_VIDEO = /^\/api\/line-videos\/[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export type LineVideoType = "video/mp4" | "video/quicktime" | "video/webm"

export function lineVideoTooLarge(): string {
  return "That video is too large. Keep it under 40 MB."
}

/** A proposal-line clip. The file stays in storage. This is only the playback address. */
export function lineVideo(src: string | undefined): string | undefined {
  if (!src) return undefined
  const value = src.trim()
  if (value.length === 0 || value.length > 2_000 || /\s/.test(value)) return undefined
  if (LOCAL_VIDEO.test(value)) return value
  let url: URL
  try {
    url = new URL(value)
  } catch {
    return undefined
  }
  if (url.protocol !== "https:") return undefined
  const path = url.pathname.toLowerCase()
  if (!path.includes("/line-videos/")) return undefined
  if (!path.endsWith(".mp4") && !path.endsWith(".mov") && !path.endsWith(".webm")) return undefined
  return value
}

export function isLineVideoId(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}

export function inspectLineVideo(input: {
  bytes: Uint8Array
}): { ok: true; contentType: LineVideoType; extension: ".mp4" | ".mov" | ".webm" } | { ok: false; reason: string } {
  if (input.bytes.byteLength === 0) return { ok: false, reason: "That video is empty." }
  if (input.bytes.byteLength > LINE_VIDEO_BYTE_LIMIT) return { ok: false, reason: lineVideoTooLarge() }
  const kind = sniffedVideo(input.bytes)
  if (kind === "webm") return { ok: true, contentType: "video/webm", extension: ".webm" }
  if (kind === "mov") return { ok: true, contentType: "video/quicktime", extension: ".mov" }
  if (kind === "mp4") return { ok: true, contentType: "video/mp4", extension: ".mp4" }
  return { ok: false, reason: "Choose an mp4, mov, or webm video." }
}

/** Byte range for a stream. A missing header plays the whole file. */
export function lineVideoRange(
  size: number,
  header: string | null,
): { start: number; end: number; status: 200 | 206 } | null {
  if (size <= 0) return null
  if (!header) return { start: 0, end: size - 1, status: 200 }
  const match = /^bytes=(\d*)-(\d*)$/.exec(header.trim())
  if (!match) return null
  const startText = match[1] ?? ""
  const endText = match[2] ?? ""
  if (!startText && !endText) return null
  let start = 0
  let end = size - 1
  if (!startText) {
    const suffix = Number(endText)
    if (!Number.isInteger(suffix) || suffix <= 0) return null
    start = Math.max(0, size - suffix)
  } else {
    start = Number(startText)
    end = endText ? Number(endText) : size - 1
  }
  if (!Number.isInteger(start) || !Number.isInteger(end)) return null
  if (start < 0 || start >= size || end < start) return null
  return { start, end: Math.min(end, size - 1), status: 206 }
}

function sniffedVideo(bytes: Uint8Array): "mp4" | "mov" | "webm" | null {
  if (bytes.length >= 4 && bytes[0] === 0x1a && bytes[1] === 0x45 && bytes[2] === 0xdf && bytes[3] === 0xa3) {
    return "webm"
  }
  if (bytes.length < 12) return null
  if (bytes[4] !== 0x66 || bytes[5] !== 0x74 || bytes[6] !== 0x79 || bytes[7] !== 0x70) return null
  const brand = String.fromCharCode(bytes[8] ?? 0, bytes[9] ?? 0, bytes[10] ?? 0, bytes[11] ?? 0)
  if (brand === "qt  ") return "mov"
  return "mp4"
}
