"use client"

import { useState, type ReactNode } from "react"
import { Camera, ImagePlus } from "lucide-react"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { useSitePhotos } from "@/hooks/use-site-photos"
import { describeLink, linkChoices, linkKey, PHOTO_TAG_LABELS } from "@/lib/photos/link"
import { PHOTO_TAGS, type PhotoTag } from "@/lib/types"

export function PhotoCapture({ estimateId }: { estimateId: string }) {
  const { photos, photoScope, uploading, uploadError, upload } = useSitePhotos(estimateId)
  const [tag, setTag] = useState<PhotoTag>("before")
  const [caption, setCaption] = useState("")
  const [linkOverride, setLinkOverride] = useState<string | null>(null)
  const choices = photoScope ? linkChoices(photoScope) : []
  const selectedKey = linkOverride ?? (photoScope ? linkKey(choices.find((item) => item.kind === defaultKind(tag)) ?? choices[0] ?? { kind: "area", id: null }) : "")
  const selected = choices.find((item) => linkKey(item) === selectedKey) ?? choices[0]
  const linked = selected && photoScope ? describeLink(selected, photoScope) : null

  const send = (file: File | undefined) => {
    if (!file || !selected) return
    void upload(file, {
      tag,
      caption,
      linkKind: selected.kind,
      linkId: selected.id,
    }).then(() => setCaption(""))
  }

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-xs font-semibold tracking-[0.14em] text-muted-foreground uppercase">
        Site photos
      </h2>
      {photos.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
          No site photos yet. Take one before you start, and another when the room is done.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {photos.map((photo) => {
            const detail = photoScope ? describeLink({ kind: photo.linkKind, id: photo.linkId }, photoScope) : null
            return (
              <li key={photo.id} data-photo-id={photo.id} className="overflow-hidden rounded-2xl bg-card ring-1 ring-foreground/10">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={photo.url} alt={photo.caption || PHOTO_TAG_LABELS[photo.tag] || "Site photo"} className="aspect-[4/3] max-h-56 w-full object-cover" />
                <div className="flex flex-col gap-1 px-4 py-3">
                  <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                    {PHOTO_TAG_LABELS[photo.tag] ?? "In progress"}
                  </p>
                  <p className="text-sm">{photo.caption || "Site update"}</p>
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
      <label className="grid gap-1 text-sm">
        <span className="font-medium">Tag</span>
        <select
          data-testid="photo-tag"
          aria-label="Photo tag"
          value={tag}
          onChange={(event) => {
            setTag(event.target.value as PhotoTag)
            setLinkOverride(null)
          }}
          className="h-11 rounded-lg border border-input bg-transparent px-2"
        >
          {PHOTO_TAGS.map((item) => (
            <option key={item} value={item}>
              {PHOTO_TAG_LABELS[item]}
            </option>
          ))}
        </select>
      </label>
      {choices.length > 0 ? (
        <label className="grid gap-1 text-sm">
          <span className="font-medium">Links to</span>
          <select
            data-testid="photo-link"
            aria-label="Photo link"
            value={selected ? linkKey(selected) : ""}
            onChange={(event) => setLinkOverride(event.target.value)}
            className="h-11 rounded-lg border border-input bg-transparent px-2"
          >
            {choices.map((choice) => (
              <option key={linkKey(choice)} value={linkKey(choice)}>
                {choice.label}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      {linked?.detail ? (
        <p data-testid="photo-link-detail" className="rounded-lg bg-amber-50 px-3 py-2 text-sm">
          {linked.detail}
        </p>
      ) : null}
      <div className="grid gap-2">
        <Label htmlFor="photo-caption">Caption</Label>
        <Input
          id="photo-caption"
          data-testid="photo-caption"
          value={caption}
          placeholder="North wall, first coat"
          className="h-11"
          onValueChange={setCaption}
        />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <FileButton
          testId="photo-camera"
          capture
          disabled={uploading}
          icon={<Camera className="size-4" />}
          label={uploading ? "Uploading…" : "Take photo"}
          onFile={send}
        />
        <FileButton
          testId="photo-library"
          disabled={uploading}
          icon={<ImagePlus className="size-4" />}
          label="Photo library"
          onFile={send}
        />
      </div>
      {uploadError ? <p className="text-sm text-destructive">{uploadError}</p> : null}
    </section>
  )
}

function defaultKind(tag: PhotoTag): "prep" | "line" | "area" {
  if (tag === "prep_concern") return "prep"
  if (tag === "touch_up") return "line"
  return "area"
}

function FileButton({
  testId,
  capture = false,
  disabled,
  icon,
  label,
  onFile,
}: {
  testId: string
  capture?: boolean
  disabled: boolean
  icon: ReactNode
  label: string
  onFile: (file: File | undefined) => void
}) {
  return (
    <label className="inline-flex">
      <input
        type="file"
        accept="image/*"
        capture={capture ? "environment" : undefined}
        data-testid={testId}
        className="sr-only"
        disabled={disabled}
        onChange={(event) => {
          const file = event.target.files?.[0]
          event.target.value = ""
          onFile(file)
        }}
      />
      <span className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground">
        {icon}
        {label}
      </span>
    </label>
  )
}
