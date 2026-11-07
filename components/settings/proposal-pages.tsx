"use client"

import { useState, type Dispatch, type SetStateAction } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useScope } from "@/lib/data/store"
import {
  DEFAULT_ACCEPT_WORDING,
  DEFAULT_DECLINE_WORDING,
  DEFAULT_PROPOSAL_TEMPLATES,
  PROPOSAL_TEMPLATE_KINDS,
  PROPOSAL_TEMPLATE_LABELS,
  contractTermsText,
  proposalDocument,
  templateLinesText,
} from "@/lib/proposals/document"
import type {
  EstimateKind,
  ProposalKindTemplate,
  ProposalPages,
  ProposalPhoto,
  ProposalTestimonial,
} from "@/lib/types"

type EditableTemplates = Record<EstimateKind, Required<ProposalKindTemplate>>

function buildInitialTemplates(current: ReturnType<typeof proposalDocument>): EditableTemplates {
  return {
    interior: {
      scopeOverview: current.templates.interior.scopeOverview,
      preparation: templateLinesText(current.templates.interior.preparation),
      materials: templateLinesText(current.templates.interior.materials),
      exclusions: templateLinesText(current.templates.interior.exclusions),
      warranty: current.templates.interior.warranty,
      paymentTerms: current.templates.interior.paymentTerms,
    },
    exterior: {
      scopeOverview: current.templates.exterior.scopeOverview,
      preparation: templateLinesText(current.templates.exterior.preparation),
      materials: templateLinesText(current.templates.exterior.materials),
      exclusions: templateLinesText(current.templates.exterior.exclusions),
      warranty: current.templates.exterior.warranty,
      paymentTerms: current.templates.exterior.paymentTerms,
    },
    cabinets: {
      scopeOverview: current.templates.cabinets.scopeOverview,
      preparation: templateLinesText(current.templates.cabinets.preparation),
      materials: templateLinesText(current.templates.cabinets.materials),
      exclusions: templateLinesText(current.templates.cabinets.exclusions),
      warranty: current.templates.cabinets.warranty,
      paymentTerms: current.templates.cabinets.paymentTerms,
    },
  }
}

export function ProposalPagesEditor() {
  const scope = useScope()
  const current = proposalDocument(scope.estimateSettings)
  const [activeKind, setActiveKind] = useState<EstimateKind>("interior")
  const [templates, setTemplates] = useState<EditableTemplates>(() => buildInitialTemplates(current))
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

  const activeTemplate = templates[activeKind]

  const patchActiveTemplate = (patch: Partial<Required<ProposalKindTemplate>>) => {
    setSaved(false)
    setTemplates((prev) => ({
      ...prev,
      [activeKind]: {
        ...prev[activeKind],
        ...patch,
      },
    }))
  }

  const resetActiveTemplate = () => {
    const defaults = DEFAULT_PROPOSAL_TEMPLATES[activeKind]
    setSaved(false)
    setTemplates((prev) => ({
      ...prev,
      [activeKind]: {
        scopeOverview: defaults.scopeOverview,
        preparation: templateLinesText(defaults.preparation),
        materials: templateLinesText(defaults.materials),
        exclusions: templateLinesText(defaults.exclusions),
        warranty: defaults.warranty,
        paymentTerms: defaults.paymentTerms,
      },
    }))
  }

  const save = () => {
    const pages: ProposalPages = {
      coverLine: coverLine.trim(),
      photos,
      testimonials: testimonials.filter((item) => item.quote.trim() && item.name.trim()),
      contractTerms: terms.trim(),
      acceptWording: acceptWording.trim() || DEFAULT_ACCEPT_WORDING,
      declineWording: declineWording.trim() || DEFAULT_DECLINE_WORDING,
      templates: {
        interior: {
          scopeOverview: templates.interior.scopeOverview.trim(),
          preparation: templates.interior.preparation.trim(),
          materials: templates.interior.materials.trim(),
          exclusions: templates.interior.exclusions.trim(),
          warranty: templates.interior.warranty.trim(),
          paymentTerms: templates.interior.paymentTerms.trim(),
        },
        exterior: {
          scopeOverview: templates.exterior.scopeOverview.trim(),
          preparation: templates.exterior.preparation.trim(),
          materials: templates.exterior.materials.trim(),
          exclusions: templates.exterior.exclusions.trim(),
          warranty: templates.exterior.warranty.trim(),
          paymentTerms: templates.exterior.paymentTerms.trim(),
        },
        cabinets: {
          scopeOverview: templates.cabinets.scopeOverview.trim(),
          preparation: templates.cabinets.preparation.trim(),
          materials: templates.cabinets.materials.trim(),
          exclusions: templates.cabinets.exclusions.trim(),
          warranty: templates.cabinets.warranty.trim(),
          paymentTerms: templates.cabinets.paymentTerms.trim(),
        },
      },
    }
    scope.updateEstimateSettings({ ...scope.estimateSettings, proposalPages: pages })
    setSaved(true)
  }

  return (
    <section className="flex flex-col gap-4 rounded-2xl bg-card p-4 border border-slate-200 bg-white shadow-sm" data-testid="proposal-pages-editor">
      <div>
        <h2 className="text-lg font-semibold">Proposal pages &amp; standard templates</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Save your reusable Scope of Work, Preparation Procedures, Materials, Exclusions, Warranty, and Payment Terms once for Interior, Exterior, and Cabinets &amp; Specialty Painting. Scopepipe automatically combines the matching template with each job&apos;s rooms, surfaces, coats, paint products, and pricing.
        </p>
      </div>

      <div className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-slate-50/70 p-4" data-testid="proposal-standard-templates">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold">Standard Painting Proposal Templates</h3>
            <p className="text-xs text-muted-foreground">
              Default warranties, materials, exclusions, and payment terms are editable examples—customize them to match your company policies.
            </p>
          </div>
          <button
            type="button"
            data-testid="reset-proposal-template"
            className="text-xs font-medium text-primary hover:underline"
            onClick={resetActiveTemplate}
          >
            Reset {PROPOSAL_TEMPLATE_LABELS[activeKind]} to example wording
          </button>
        </div>

        <div className="flex flex-wrap gap-2" role="tablist" aria-label="Proposal template type">
          {PROPOSAL_TEMPLATE_KINDS.map((kind) => {
            const selected = kind === activeKind
            return (
              <button
                key={kind}
                type="button"
                role="tab"
                aria-selected={selected}
                data-testid={`proposal-template-${kind}`}
                onClick={() => setActiveKind(kind)}
                className={
                  selected
                    ? "rounded-full bg-primary px-3.5 py-1.5 text-sm font-medium text-primary-foreground"
                    : "rounded-full border border-slate-200 bg-white px-3.5 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100"
                }
              >
                {PROPOSAL_TEMPLATE_LABELS[kind]}
              </button>
            )
          })}
        </div>

        <div className="grid gap-3">
          <div className="grid gap-1">
            <Label htmlFor="proposal-template-scope-overview">
              {PROPOSAL_TEMPLATE_LABELS[activeKind]} — Standard Scope of Work Overview
            </Label>
            <textarea
              id="proposal-template-scope-overview"
              data-testid="proposal-template-scope-overview"
              value={activeTemplate.scopeOverview}
              rows={2}
              className="rounded-lg border border-input bg-white px-3 py-2 text-sm leading-6 outline-none"
              onChange={(event) => patchActiveTemplate({ scopeOverview: event.target.value })}
            />
          </div>

          <div className="grid gap-1">
            <Label htmlFor="proposal-template-preparation">Preparation Procedures (one procedure per line)</Label>
            <textarea
              id="proposal-template-preparation"
              data-testid="proposal-template-preparation"
              value={activeTemplate.preparation}
              rows={5}
              className="rounded-lg border border-input bg-white px-3 py-2 text-sm leading-6 outline-none"
              onChange={(event) => patchActiveTemplate({ preparation: event.target.value })}
            />
          </div>

          <div className="grid gap-1">
            <Label htmlFor="proposal-template-materials">Materials &amp; Paint System (one item per line)</Label>
            <textarea
              id="proposal-template-materials"
              data-testid="proposal-template-materials"
              value={activeTemplate.materials}
              rows={3}
              className="rounded-lg border border-input bg-white px-3 py-2 text-sm leading-6 outline-none"
              onChange={(event) => patchActiveTemplate({ materials: event.target.value })}
            />
            <p className="text-xs text-muted-foreground">
              The specific paint products and coat counts selected in the estimator are automatically listed alongside these standard material specifications.
            </p>
          </div>

          <div className="grid gap-1">
            <Label htmlFor="proposal-template-exclusions">Exclusions (one item per line)</Label>
            <textarea
              id="proposal-template-exclusions"
              data-testid="proposal-template-exclusions"
              value={activeTemplate.exclusions}
              rows={3}
              className="rounded-lg border border-input bg-white px-3 py-2 text-sm leading-6 outline-none"
              onChange={(event) => patchActiveTemplate({ exclusions: event.target.value })}
            />
          </div>

          <div className="grid gap-1">
            <Label htmlFor="proposal-template-warranty">Warranty (editable example)</Label>
            <textarea
              id="proposal-template-warranty"
              data-testid="proposal-template-warranty"
              value={activeTemplate.warranty}
              rows={2}
              className="rounded-lg border border-input bg-white px-3 py-2 text-sm leading-6 outline-none"
              onChange={(event) => patchActiveTemplate({ warranty: event.target.value })}
            />
          </div>

          <div className="grid gap-1">
            <Label htmlFor="proposal-template-payment-terms">Payment Terms (editable example)</Label>
            <textarea
              id="proposal-template-payment-terms"
              data-testid="proposal-template-payment-terms"
              value={activeTemplate.paymentTerms}
              rows={2}
              className="rounded-lg border border-input bg-white px-3 py-2 text-sm leading-6 outline-none"
              onChange={(event) => patchActiveTemplate({ paymentTerms: event.target.value })}
            />
          </div>
        </div>
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
