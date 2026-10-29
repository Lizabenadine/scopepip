"use client"

import { useState } from "react"
import { Play } from "lucide-react"
import { lineVideo } from "@/lib/estimate/line-video"

export function ProposalLineVideo({
  src,
  label,
  testId = "proposal-line-video",
}: {
  src: string | undefined
  label: string
  testId?: string
}) {
  const video = lineVideo(src)
  const [playing, setPlaying] = useState(false)
  if (!video) return null
  if (!playing) {
    return (
      <button
        type="button"
        className="mb-2 block w-full max-w-xs text-left"
        data-testid={testId}
        aria-label={`Play ${label}`}
        onClick={() => setPlaying(true)}
      >
        <span className="relative block aspect-video overflow-hidden rounded-xl bg-foreground/10">
          <video src={video} preload="metadata" muted playsInline className="size-full object-cover" />
          <span className="absolute inset-0 grid place-items-center">
            <Play className="size-10 rounded-full bg-background/90 p-2" aria-hidden />
          </span>
        </span>
      </button>
    )
  }
  return (
    <video
      src={video}
      controls
      autoPlay
      playsInline
      className="mb-2 aspect-video w-full max-w-xs rounded-xl bg-foreground/5"
      data-testid={`${testId}-player`}
      aria-label={label}
    />
  )
}
