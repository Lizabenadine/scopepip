import { sessionFromRequest } from "@/lib/auth/request"
import { logoFileError } from "@/lib/brand/logo"
import { supabaseAdmin, supabaseProjectUrl } from "@/lib/supabase/admin"

export const runtime = "nodejs"

const BUCKET = "company-assets"

function publicLogoUrl(companyId: string): string {
  const base = supabaseProjectUrl().replace(/\/$/, "")
  return `${base}/storage/v1/object/public/${BUCKET}/${companyId}/logo?v=${Date.now()}`
}

export async function POST(request: Request) {
  const session = await sessionFromRequest(request)
  if (!session) return Response.json({ ok: false, reason: "Sign in before uploading a logo." }, { status: 401 })
  const form = await request.formData().catch(() => null)
  const file = form?.get("file")
  if (!(file instanceof File)) return Response.json({ ok: false, reason: "Choose an image." }, { status: 400 })
  const reason = logoFileError({ type: file.type, size: file.size })
  if (reason) return Response.json({ ok: false, reason }, { status: 400 })

  const admin = supabaseAdmin()
  if (!admin) return Response.json({ ok: false, reason: "storage-off" })

  const bytes = new Uint8Array(await file.arrayBuffer())
  const { error } = await admin.storage.from(BUCKET).upload(`${session.companyId}/logo`, bytes, {
    contentType: file.type,
    upsert: true,
  })
  if (error) {
    const message = /bucket not found/i.test(error.message)
      ? "The company-assets bucket is not on this project yet."
      : "The logo could not be saved."
    return Response.json({ ok: false, reason: message }, { status: 502 })
  }
  return Response.json({ ok: true, url: publicLogoUrl(session.companyId) })
}

export async function DELETE(request: Request) {
  const session = await sessionFromRequest(request)
  if (!session) return Response.json({ ok: false }, { status: 401 })
  const admin = supabaseAdmin()
  if (admin) await admin.storage.from(BUCKET).remove([`${session.companyId}/logo`]).catch(() => undefined)
  return Response.json({ ok: true })
}
