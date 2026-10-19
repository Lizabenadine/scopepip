"use client"

import { useState, type Dispatch, type SetStateAction } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useScope } from "@/lib/data/store"
import {
  DEFAULT_ACCEPT_WORDING,
  DEFAULT_DECLINE_WORDING,
  contractTermsText,
  proposalDocument,
} from "@/lib/proposals/document"
import type { ProposalPages, ProposalPhoto, ProposalTestimonial } from "@/lib/types"

export function ProposalPagesEditor() {
  const scope = useScope()
  const current = proposalDocument(scope.estimateSettings)
  const [coverLine, setCoverLine] = useState(scope.estimateSettings.proposalPages?.coverLine ?? "")
  const [terms, setTerms] = useState(
    scope.estimateSettings.proposalPages?.contractTerms?.trim() || contractTermsText(current.contractTerms),
  )
  const [acceptWording, setAcceptWording] = useState(
    scope.estimateSettings.proposalPages?.acceptWording?.trim() || current.acceptWording,
  )
  const [declineWording, setDeclineWording] = useState(
    scope.estimateSettings.proposalPages?.declineWording?.trim() || current.declineWording,
  )
  const [photos, setPhotos] = useState<ProposalPhoto[]>(current.photos)
  const [testimonials, setTestimonials] = useState<ProposalTestimonial[]>(
    scope.estimateSettings.proposalPages?.testimonials ?? current.testimonials,
  )
  const [saved, setSaved] = useState(false)
  const [photoError, setPhotoError] = useState<string | null>(null)

  const save = () => {
    const pages: ProposalPages = {
      coverLine: coverLine.trim(),
      photos,
      testimonials: testimonials.filter((item) => item.quote.trim() && item.name.trim()),
      contractTerms: terms.trim(),
      acceptWording: acceptWording.trim() || DEFAULT_ACCEPT_WORDING,
      declineWording: declineWording.trim() || DEFAULT_DECLINE_WORDING,
    }
    scope.updateEstimateSettings({ ...scope.estimateSettings, proposalPages: pages })
    setSaved(true)
  }

  return (
    <section className="flex flex-col gap-4 rounded-2xl bg-card p-4 ring-1 ring-foreground/10" data-testid="proposal-pages-editor">
      <div>
        <h2 className="text-lg font-semibold">Proposal pages</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          The customer proposal opens on a cover, then the scope, then any photo pages and testimonials, then the contract, then the signature. Accept and decline wording sits under the signature.
        </p>
      </div>
      <div className="grid gap-1">
        <Label htmlFor="proposal-cover-line">Cover line</Label>
        <Input
          id="proposal-cover-line"
          data-testid="proposal-cover-line-input"
          value={coverLine}
          placeholder="Interior painting, scheduled around your week."
          className="h-11"
          onValueChange={setCoverLine}
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="proposal-photo-file">Photo pages</Label>
        <input
          id="proposal-photo-file"
          data-testid="proposal-photo-file"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="text-sm"
          onChange={(event) => {
            const file = event.target.files?.[0]
            event.target.value = ""
            if (!file) return
            if (photos.length >= 8) {
              setPhotoError("Eight photos is the page limit.")
              return
            }
            void compressPhoto(file)
              .then((src) => {
                setPhotos((currentPhotos) => [
                  ...currentPhotos,
                  { id: crypto.randomUUID(), caption: "", src },
                ])
                setPhotoError(null)
                setSaved(false)
              })
              .catch((error: unknown) => {
                setPhotoError(error instanceof Error ? error.message : "Choose a photo.")
              })
          }}
        />
        {photoError ? <p className="text-sm text-destructive">{photoError}</p> : null}
        {photos.length === 0 ? (
          <p className="text-sm text-muted-foreground">Photo pages appear on the proposal after you add a picture.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {photos.map((photo) => (
              <figure key={photo.id} className="overflow-hidden rounded-xl bg-muted">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={photo.src} alt={photo.caption || "Proposal photo"} className="aspect-[4/3] w-full object-cover" />
                <figcaption className="grid gap-2 p-3">
                  <Input
                    aria-label="Photo caption"
                    value={photo.caption}
                    placeholder="Caption"
                    className="h-10"
                    onValueChange={(caption) =>
                      setPhotos((currentPhotos) =>
                        currentPhotos.map((item) => (item.id === photo.id ? { ...item, caption } : item)),
                      )
                    }
                  />
                  <button
                    type="button"
                    className="text-left text-sm text-muted-foreground"
                    onClick={() => setPhotos((currentPhotos) => currentPhotos.filter((item) => item.id !== photo.id))}
                  >
                    Remove photo
                  </button>
                </figcaption>
              </figure>
            ))}
          </div>
        )}
      </div>
      <div className="grid gap-3">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-sm font-medium">Testimonials</h3>
          <button
            type="button"
            className="text-sm font-medium text-primary"
            data-testid="add-testimonial"
            onClick={() =>
              setTestimonials((currentRows) =>
                currentRows.length >= 8
                  ? currentRows
                  : [...currentRows, { id: crypto.randomUUID(), quote: "", name: "", detail: "" }],
              )
            }
          >
            Add testimonial
          </button>
        </div>
        {testimonials.length === 0 ? (
          <p className="text-sm text-muted-foreground">Testimonials appear on their own page after you add one.</p>
        ) : (
          testimonials.map((item, index) => (
            <div key={item.id} className="grid gap-2 rounded-xl bg-muted/50 p-3">
              <Label htmlFor={`testimonial-quote-${item.id}`}>Quote</Label>
              <textarea
                id={`testimonial-quote-${item.id}`}
                value={item.quote}
                rows={3}
                className="rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none"
                onChange={(event) => updateTestimonial(setTestimonials, item.id, { quote: event.target.value })}
              />
              <div className="grid gap-2 sm:grid-cols-2">
                <div className="grid gap-1">
                  <Label htmlFor={`testimonial-name-${item.id}`}>Name</Label>
                  <Input
                    id={`testimonial-name-${item.id}`}
                    data-testid={`testimonial-name-${index}`}
                    value={item.name}
                    className="h-10"
                    onValueChange={(name) => updateTestimonial(setTestimonials, item.id, { name })}
                  />
                </div>
                <div className="grid gap-1">
                  <Label htmlFor={`testimonial-detail-${item.id}`}>Place or job</Label>
                  <Input
                    id={`testimonial-detail-${item.id}`}
                    value={item.detail}
                    className="h-10"
                    onValueChange={(detail) => updateTestimonial(setTestimonials, item.id, { detail })}
                  />
                </div>
              </div>
              <button
                type="button"
                className="text-left text-sm text-muted-foreground"
                onClick={() => setTestimonials((currentRows) => currentRows.filter((row) => row.id !== item.id))}
              >
                Remove testimonial
              </button>
            </div>
          ))
        )}
      </div>
      <div className="grid gap-1">
        <Label htmlFor="proposal-contract">Contract terms</Label>
        <textarea
          id="proposal-contract"
          data-testid="proposal-contract"
          value={terms}
          rows={8}
          className="rounded-lg border border-input bg-transparent px-3 py-2 text-sm leading-6 outline-none"
          onChange={(event) => setTerms(event.target.value)}
        />
        <p className="text-xs text-muted-foreground">One term per line. A blank contract uses the built-in terms.</p>
      </div>
      <div className="grid gap-1">
        <Label htmlFor="proposal-accept-wording">Accept wording</Label>
        <textarea
          id="proposal-accept-wording"
          data-testid="proposal-accept-wording"
          value={acceptWording}
          rows={3}
          className="rounded-lg border border-input bg-transparent px-3 py-2 text-sm leading-6 outline-none"
          onChange={(event) => setAcceptWording(event.target.value)}
        />
      </div>
      <div className="grid gap-1">
        <Label htmlFor="proposal-decline-wording">Decline wording</Label>
        <textarea
          id="proposal-decline-wording"
          data-testid="proposal-decline-wording"
          value={declineWording}
          rows={3}
          className="rounded-lg border border-input bg-transparent px-3 py-2 text-sm leading-6 outline-none"
          onChange={(event) => setDeclineWording(event.target.value)}
        />
      </div>
      <div className="flex items-center gap-2">
        <Button type="button" className="h-11" data-testid="save-proposal-pages" onClick={() => save()}>
          Save proposal pages
        </Button>
        {saved ? <p className="text-sm text-primary">Saved</p> : null}
      </div>
    </section>
  )
}

function updateTestimonial(
  setTestimonials: Dispatch<SetStateAction<ProposalTestimonial[]>>,
  id: string,
  patch: Partial<ProposalTestimonial>,
) {
  setTestimonials((currentRows) => currentRows.map((row) => (row.id === id ? { ...row, ...patch } : row)))
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
