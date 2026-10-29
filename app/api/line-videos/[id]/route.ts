import fs from "node:fs"
import { Readable } from "node:stream"
import { lineVideoRange } from "@/lib/estimate/line-video"
import { openLineVideo } from "@/lib/storage/line-videos"

export const runtime = "nodejs"

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params
  const video = openLineVideo(id)
  if (!video) return new Response(null, { status: 404 })

  const range = lineVideoRange(video.size, request.headers.get("range"))
  if (!range) {
    return new Response(null, {
      status: 416,
      headers: { "Content-Range": `bytes */${video.size}` },
    })
  }

  const node = fs.createReadStream(video.filePath, { start: range.start, end: range.end })
  const headers = new Headers({
    "Accept-Ranges": "bytes",
    "Content-Length": String(range.end - range.start + 1),
    "Content-Type": video.contentType,
    "Cache-Control": "private, max-age=3600",
  })
  if (range.status === 206) headers.set("Content-Range", `bytes ${range.start}-${range.end}/${video.size}`)
  return new Response(Readable.toWeb(node) as ReadableStream, { status: range.status, headers })
}
