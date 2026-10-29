import { readCompanyBook } from "@/lib/auth/directory"
import { sessionFromRequest } from "@/lib/auth/request"
import { LINE_VIDEO_BYTE_LIMIT, lineVideoTooLarge } from "@/lib/estimate/line-video"
import { storeLineVideo } from "@/lib/storage/line-videos"

export const runtime = "nodejs"

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string; lineId: string }> },
) {
  const session = await sessionFromRequest(request)
  if (!session) return Response.json({ error: "Sign in before uploading a video." }, { status: 401 })

  const { id, lineId } = await context.params
  const estimateId = id.trim()
  const line = lineId.trim()
  if (!estimateId || !line || line.length > 80 || /[\\/]/.test(line)) {
    return Response.json({ error: "This estimate is not on file." }, { status: 404 })
  }

  const book = await readCompanyBook(session.companyId)
  const estimate = book?.state.estimates.find((item) => item.id === estimateId)
  if (!estimate) return Response.json({ error: "This estimate is not on file." }, { status: 404 })

  const form = await request.formData().catch(() => null)
  const file = form?.get("file")
  if (!(file instanceof File)) return Response.json({ error: "Choose an mp4, mov, or webm video." }, { status: 400 })
  if (file.size === 0) return Response.json({ error: "That video is empty." }, { status: 400 })
  if (file.size > LINE_VIDEO_BYTE_LIMIT) return Response.json({ error: lineVideoTooLarge() }, { status: 400 })

  const stored = await storeLineVideo({
    companyId: session.companyId,
    estimateId,
    lineId: line,
    bytes: new Uint8Array(await file.arrayBuffer()),
  })
  if (!stored.ok) return Response.json({ error: stored.reason }, { status: 400 })
  return Response.json({ url: stored.video.url })
}
