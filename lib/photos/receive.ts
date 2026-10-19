import { PHOTO_TAGS, type PhotoLinkKind, type PhotoTag, type SitePhoto } from "../types.ts"

const MAX_BYTES = 8 * 1024 * 1024

const LINK_KINDS: PhotoLinkKind[] = ["area", "line", "prep"]

export interface IncomingPhoto {
  tag: string | null
  caption: string
  linkKind: string | null
  linkId: string | null
  fileName: string
  contentType: string
  bytes: Uint8Array
}

export type ReceivedPhoto =
  | { ok: true; photo: SitePhoto }
  | { ok: false; reason: string }

export function receivePhoto(estimateId: string, input: IncomingPhoto, now = new Date()): ReceivedPhoto {
  const id = estimateId.trim()
  if (!id) return { ok: false, reason: "This work order is not on file." }
  if (!isPhotoTag(input.tag)) return { ok: false, reason: "Choose a photo tag." }
  if (!isImage(input.contentType, input.bytes)) return { ok: false, reason: "Choose a photo." }
  if (input.bytes.byteLength === 0) return { ok: false, reason: "That photo is empty." }
  if (input.bytes.byteLength > MAX_BYTES) return { ok: false, reason: "That photo is too large." }

  const linkKind = isLinkKind(input.linkKind) ? input.linkKind : null
  const linkId = input.linkId?.trim() || null
  const photoId = crypto.randomUUID()
  const safeName = input.fileName.replace(/[^a-zA-Z0-9._-]/g, "") || "site.jpg"
  const contentType = input.contentType || sniffedType(input.bytes) || "image/jpeg"

  return {
    ok: true,
    photo: {
      id: photoId,
      estimateId: id,
      caption: input.caption.trim(),
      tag: input.tag,
      linkKind,
      linkId,
      storagePath: `local/${id}/${photoId}-${safeName}`,
      url: `data:${contentType};base64,${toBase64(input.bytes)}`,
      createdAt: now.toISOString(),
    },
  }
}

export function isPhotoTag(value: string | null | undefined): value is PhotoTag {
  return PHOTO_TAGS.includes(value as PhotoTag)
}

function isLinkKind(value: string | null | undefined): value is PhotoLinkKind {
  return LINK_KINDS.includes(value as PhotoLinkKind)
}

function isImage(contentType: string, bytes: Uint8Array): boolean {
  if (contentType.startsWith("image/")) return true
  return sniffedType(bytes) !== null
}

function sniffedType(bytes: Uint8Array): string | null {
  if (bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
    return "image/png"
  }
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg"
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return "image/webp"
  }
  return null
}

function toBase64(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString("base64")
}
