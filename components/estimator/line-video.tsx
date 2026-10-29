"use client"

import { useState } from "react"
import { Label } from "@/components/ui/label"
import { LINE_VIDEO_BYTE_LIMIT, lineVideo, lineVideoTooLarge } from "@/lib/estimate/line-video"

export function LineVideoField({
  estimateId,
  lineId,
  video,
  onVideo,
}: {
  estimateId: string | null
  lineId: string
  video: string | undefined
  onVideo: (video: string | undefined) => void
}) {
  const [error, setError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const shown = lineVideo(video)

  return (
    <div className="mt-3 grid gap-2">
      <Label htmlFor={estimateId && !shown ? `line-video-${lineId}` : undefined}>Video on the proposal</Label>
      {!estimateId ? (
        <p className="text-sm text-muted-foreground">Save this estimate before adding a video.</p>
      ) : shown ? (
        <div>
          <p className="text-sm" data-testid={`line-video-ready-${lineId}`}>
            Video attached
          </p>
          <button
            type="button"
            className="mt-2 text-sm text-muted-foreground"
            onClick={() => {
              onVideo(undefined)
              setError(null)
            }}
          >
            Remove video
          </button>
        </div>
      ) : (
        <input
          id={`line-video-${lineId}`}
          data-testid={`line-video-${lineId}`}
          type="file"
          accept="video/mp4,video/quicktime,video/webm,.mp4,.mov,.webm"
          disabled={uploading}
          className="text-sm"
          onChange={(event) => {
            const file = event.target.files?.[0]
            event.target.value = ""
            if (!file) return
            void uploadVideo(estimateId, lineId, file, setUploading, setError, onVideo)
          }}
        />
      )}
      {uploading ? <p className="text-sm text-muted-foreground">Uploading video</p> : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  )
}

async function uploadVideo(
  estimateId: string,
  lineId: string,
  file: File,
  setUploading: (uploading: boolean) => void,
  setError: (error: string | null) => void,
  onVideo: (video: string | undefined) => void,
) {
  const name = file.name.toLowerCase()
  const allowed =
    file.type === "video/mp4" ||
    file.type === "video/quicktime" ||
    file.type === "video/webm" ||
    name.endsWith(".mp4") ||
    name.endsWith(".mov") ||
    name.endsWith(".webm")
  if (!allowed) {
    setError("Choose an mp4, mov, or webm video.")
    return
  }
  if (file.size > LINE_VIDEO_BYTE_LIMIT) {
    setError(lineVideoTooLarge())
    return
  }
  setUploading(true)
  setError(null)
  try {
    const body = new FormData()
    body.set("file", file)
    const response = await fetch(
      `/api/estimates/${encodeURIComponent(estimateId)}/lines/${encodeURIComponent(lineId)}/video`,
      { method: "POST", body },
    )
    const payload = (await response.json().catch(() => null)) as { url?: string; error?: string } | null
    const url = lineVideo(payload?.url)
    if (!response.ok || !url) throw new Error(payload?.error || "That video didn't upload.")
    onVideo(url)
  } catch (reason: unknown) {
    setError(reason instanceof Error ? reason.message : "That video didn't upload.")
  } finally {
    setUploading(false)
  }
}
