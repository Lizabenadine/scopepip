"use client"

import { useState } from "react"
import { Camera } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useSitePhotos } from "@/hooks/use-site-photos"
import { describeLink, PHOTO_TAG_LABELS } from "@/lib/photos/link"

export function PhotoGallery({
  estimateId,
  compact = false,
}: {
  estimateId: string
  compact?: boolean
}) {
  const { photos, photoScope } = useSitePhotos(estimateId)
  const [open, setOpen] = useState(false)
  const count = photos.length

  return (
    <>
      <button
        type="button"
        data-testid={`photos-${estimateId}`}
        draggable={false}
        onDragStart={(event) => event.stopPropagation()}
        onClick={() => setOpen(true)}
        className={
          compact
            ? "inline-flex h-10 items-center gap-2 rounded-lg bg-muted px-3 text-sm font-medium"
            : "text-sm font-medium text-primary"
        }
      >
        {compact ? <Camera className="size-4" /> : null}
        Site photos{count > 0 ? ` (${count})` : ""}
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Site photos</DialogTitle>
            <DialogDescription>
              {count === 0 ? "Nothing from the job site yet." : `${count} from this work order.`}
            </DialogDescription>
          </DialogHeader>
          {count === 0 ? (
            <p className="px-4 pb-6 text-sm text-muted-foreground">
              Photos the crew takes on the work order show up here, tagged to the room, the prep note, or a line item.
            </p>
          ) : (
            <ul className="grid gap-3 px-4 pb-6 sm:grid-cols-2">
              {photos.map((photo) => {
                const detail = photoScope ? describeLink({ kind: photo.linkKind, id: photo.linkId }, photoScope) : null
                return (
                  <li key={photo.id} data-photo-id={photo.id} className="overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={photo.url}
                      alt={photo.caption || PHOTO_TAG_LABELS[photo.tag] || "Site photo"}
                      className="aspect-[4/3] max-h-56 w-full object-cover"
                    />
                    <div className="flex flex-col gap-1 px-3 py-2">
                      <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                        {PHOTO_TAG_LABELS[photo.tag] ?? "In progress"}
                      </p>
                      {photo.caption ? <p className="text-sm">{photo.caption}</p> : null}
                      {detail ? (
                        <p className="text-sm text-muted-foreground">
                          {detail.label}
                          {detail.detail ? ` · ${detail.detail}` : ""}
                        </p>
                      ) : null}
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
