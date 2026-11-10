import { sessionFromRequest } from "@/lib/auth/request"
import { logoFileError } from "@/lib/brand/logo"
import { supabaseAdmin, supabaseProjectUrl } from "@/lib/supabase/admin"

export const runtime = "nodejs"

const BUCKET = "scopepipe"

function detectImageMime(bytes: Uint8Array): string | null {
  if (bytes.byteLength < 8 || bytes.byteLength > 5 * 1024 * 1024) return null
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return "image/png"
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg"
  if (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x38) return "image/gif"
  if (
    bytes.byteLength >= 12 &&
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

export async function POST(request: Request) {
  const session = await sessionFromRequest(request)
  if (!session) return Response.json({ ok: false, reason: "Sign in before uploading a logo." }, { status: 401 })
  const form = await request.formData().catch(() => null)
  const file = form?.get("file")
  if (!(file instanceof File)) return Response.json({ ok: false, reason: "Choose an image." }, { status: 400 })
  const reason = logoFileError({ type: file.type, size: file.size })
  if (reason) return Response.json({ ok: false, reason }, { status: 400 })

  const bytes = new Uint8Array(await file.arrayBuffer())
  const mime = detectImageMime(bytes) || file.type || "image/png"
  const dataUrl = `data:${mime};base64,${Buffer.from(bytes).toString("base64")}`

  const admin = supabaseAdmin()
  if (admin) {
    await admin.storage.from(BUCKET).upload(`logos/${session.companyId}/logo`, bytes, {
      contentType: file.type,
      upsert: true,
    }).catch(() => undefined)
    if (session.authUserId) {
      await admin.storage.from(BUCKET).upload(`logos/${session.authUserId}/logo`, bytes, {
        contentType: file.type,
        upsert: true,
      }).catch(() => undefined)
    }
  }

  return Response.json({ ok: true, url: dataUrl })
}

export async function DELETE(request: Request) {
  const session = await sessionFromRequest(request)
  if (!session) return Response.json({ ok: false }, { status: 401 })
  const admin = supabaseAdmin()
  if (admin) {
    const paths = [`logos/${session.companyId}/logo`, `${session.companyId}/logo`]
    if (session.authUserId) {
      paths.push(`logos/${session.authUserId}/logo`, `${session.authUserId}/logo`)
    }
    await admin.storage.from(BUCKET).remove(paths).catch(() => undefined)
    await admin.storage.from("company-assets").remove(paths).catch(() => undefined)
  }
  return Response.json({ ok: true })
}
