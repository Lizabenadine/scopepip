"use client"

import { useState } from "react"
import { Label } from "@/components/ui/label"
import { linePhoto } from "@/lib/estimate/line-photo"

export function LinePhotoField({
  lineId,
  photo,
  onPhoto,
}: {
  lineId: string
  photo: string | undefined
  onPhoto: (photo: string | undefined) => void
}) {
  const [error, setError] = useState<string | null>(null)
  const shown = linePhoto(photo)

  return (
    <div className="mt-3 grid gap-2">
      <Label htmlFor={`line-photo-${lineId}`}>Photo on the proposal</Label>
      {shown ? (
        <div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={shown}
            alt=""
            data-testid={`line-photo-preview-${lineId}`}
            className="aspect-[4/3] w-full max-w-xs rounded-xl object-cover"
          />
          <button
            type="button"
            className="mt-2 text-sm text-muted-foreground"
            onClick={() => {
              onPhoto(undefined)
              setError(null)
            }}
          >
            Remove photo
          </button>
        </div>
      ) : (
        <input
          id={`line-photo-${lineId}`}
          data-testid={`line-photo-${lineId}`}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="text-sm"
          onChange={(event) => {
            const file = event.target.files?.[0]
            event.target.value = ""
            if (!file) return
            void compressPhoto(file)
              .then((src) => {
                onPhoto(src)
                setError(null)
              })
              .catch((reason: unknown) => {
                setError(reason instanceof Error ? reason.message : "Choose a photo.")
              })
          }}
        />
      )}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  )
}

function compressPhoto(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) return Promise.reject(new Error("Choose a photo."))
  return new Promise((resolve, reject) => {
    const image = new Image()
    const url = URL.createObjectURL(file)
    image.onload = () => {
      const max = 900
      const scale = Math.min(1, max / Math.max(image.width, image.height))
      const canvas = document.createElement("canvas")
      canvas.width = Math.max(1, Math.round(image.width * scale))
      canvas.height = Math.max(1, Math.round(image.height * scale))
      const context = canvas.getContext("2d")
      URL.revokeObjectURL(url)
      if (!context) {
        reject(new Error("Choose a photo."))
        return
      }
      context.drawImage(image, 0, 0, canvas.width, canvas.height)
      const src = canvas.toDataURL("image/jpeg", 0.72)
      if (src.length > 700_000) {
        reject(new Error("That photo is too large."))
        return
      }
      resolve(src)
    }
    image.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error("Choose a photo."))
    }
    image.src = url
  })
}
