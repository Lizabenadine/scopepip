"use client"

import { useRef, useState } from "react"
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
  const player = useRef<HTMLVideoElement>(null)
  const [playing, setPlaying] = useState(false)
  if (!video) return null

  return (
    <div className="relative mb-2 aspect-video w-full max-w-xs overflow-hidden rounded-xl bg-foreground/5">
      <video
        ref={player}
        src={video}
        controls={playing}
        playsInline
        preload="metadata"
        className="size-full object-cover"
        data-testid={playing ? `${testId}-player` : undefined}
        aria-label={label}
        onPlay={() => setPlaying(true)}
      />
      {playing ? null : (
        <button
          type="button"
          className="absolute inset-0 grid place-items-center"
          data-testid={testId}
          aria-label={`Play ${label}`}
          onClick={(event) => {
            event.preventDefault()
            event.stopPropagation()
            setPlaying(true)
            void player.current?.play()
          }}
        >
          <Play className="size-10 rounded-full bg-background/90 p-2" aria-hidden />
        </button>
      )}
    </div>
  )
}
