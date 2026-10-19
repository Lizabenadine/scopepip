import { receivePhoto } from "@/lib/photos/receive"

export const runtime = "nodejs"

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params
  const form = await request.formData().catch(() => null)
  const file = form?.get("file")
  if (!form || !(file instanceof File)) {
    return Response.json({ error: "Choose a photo." }, { status: 400 })
  }

  const received = receivePhoto(id, {
    tag: stringField(form.get("tag")),
    caption: stringField(form.get("caption")) ?? "",
    linkKind: stringField(form.get("linkKind")),
    linkId: stringField(form.get("linkId")),
    fileName: file.name || "site.jpg",
    contentType: file.type,
    bytes: new Uint8Array(await file.arrayBuffer()),
  })
  if (!received.ok) return Response.json({ error: received.reason }, { status: 400 })
  return Response.json({ photo: received.photo })
}

function stringField(value: FormDataEntryValue | null): string | null {
  if (typeof value !== "string") return null
  const trimmed = value.trim()
  return trimmed || null
}
