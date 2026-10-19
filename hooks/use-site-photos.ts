"use client"

import { useState } from "react"
import { useScope } from "@/lib/data/store"
import { autoLink, type PhotoScope } from "@/lib/photos/link"
import { prepareSitePhoto } from "@/lib/storage/site-photos"
import type { PhotoLinkKind, PhotoTag, SitePhoto } from "@/lib/types"

export function useSitePhotos(estimateId: string) {
  const scope = useScope()
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const estimate = scope.estimates.find((item) => item.id === estimateId)
  const order = scope.workOrders.find((item) => item.estimateId === estimateId)
  const photos: SitePhoto[] = order?.photos ?? []
  const photoScope: PhotoScope | null = estimate
    ? {
        areas: estimate.areas.map((area) => ({
          id: area.id,
          name: area.name,
          crewNote: area.crewNote,
          prepLevel: area.prepLevel,
        })),
        lineItems: estimate.lineItems.map((item) => ({
          id: item.id,
          label: item.label,
          crewNote: item.crewNote,
          selected: item.selected,
        })),
        prepNotes: order?.prepNotes || estimate.crewNote || estimate.notes,
      }
    : null

  const upload = async (
    file: File,
    input: { tag: PhotoTag; caption: string; linkKind: PhotoLinkKind | null; linkId: string | null },
  ) => {
    setUploading(true)
    setUploadError(null)
    try {
      const prepared = await prepareSitePhoto(file)
      const body = new FormData()
      body.set("file", prepared)
      body.set("tag", input.tag)
      body.set("caption", input.caption)
      if (input.linkKind) body.set("linkKind", input.linkKind)
      if (input.linkId) body.set("linkId", input.linkId)
      const response = await fetch(`/api/work-orders/${estimateId}/photos`, { method: "POST", body })
      const payload = (await response.json()) as { photo?: SitePhoto; error?: string }
      if (!response.ok || !payload.photo) throw new Error(payload.error ?? "Photo didn't upload.")
      scope.addSitePhoto(estimateId, payload.photo)
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : "Photo didn't upload.")
    } finally {
      setUploading(false)
    }
  }

  return {
    ready: scope.ready,
    photos,
    photoScope,
    suggested: photoScope ? (tag: PhotoTag) => autoLink(tag, photoScope) : null,
    uploading,
    uploadError,
    upload,
  }
}
