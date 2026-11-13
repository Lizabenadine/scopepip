"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Briefcase, Camera, Check, Download, HelpCircle, Link2, Pencil, Plus, Trash2, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { RoomSketchpad } from "@/components/estimator/room-sketchpad"
import { useScope } from "@/lib/data/store"
import type { AreaInput, EstimateDraft, RoomSketch } from "@/lib/types"

interface AttachedSketch extends RoomSketch {
  sourceEstimateName?: string
  sourceRoomName?: string
}

const STORAGE_KEY = "scopepipe_standalone_sketches"

export function SketchesScreen() {
  const { estimates, clients, saveEstimate } = useScope()
  const [standaloneSketches, setStandaloneSketches] = useState<RoomSketch[]>([])
  const [activeSketch, setActiveSketch] = useState<RoomSketch | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [attachingSketch, setAttachingSketch] = useState<RoomSketch | null>(null)
  const [selectedEstimateId, setSelectedEstimateId] = useState<string>("")
  const [selectedAreaId, setSelectedAreaId] = useState<string>("")
  const [notice, setNotice] = useState<string>("")

  // Load standalone sketches from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed)) {
          setStandaloneSketches(parsed)
        }
      }
    } catch {
      // ignore localStorage errors
    }
  }, [])

  function persistStandalone(next: RoomSketch[]) {
    setStandaloneSketches(next)
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    } catch {
      // ignore
    }
  }

  function handleSave(saved: RoomSketch) {
    const existingIndex = standaloneSketches.findIndex((s) => s.id === saved.id)
    const next =
      existingIndex >= 0
        ? standaloneSketches.map((s, i) => (i === existingIndex ? saved : s))
        : [saved, ...standaloneSketches]
    persistStandalone(next)
    setIsCreating(false)
    setActiveSketch(null)
  }

  function handleDelete(id: string) {
    persistStandalone(standaloneSketches.filter((s) => s.id !== id))
    if (activeSketch?.id === id) setActiveSketch(null)
  }

  function handleDownload(sketch: RoomSketch) {
    const link = document.createElement("a")
    link.download = `${(sketch.title || "sketch").toLowerCase().replace(/\s+/g, "-")}.jpg`
    link.href = sketch.imageData
    link.click()
  }

  function startAttach(sketch: RoomSketch) {
    setAttachingSketch(sketch)
    if (Array.isArray(estimates) && estimates.length > 0) {
      const first = estimates[0]
      setSelectedEstimateId(first.id)
      setSelectedAreaId(first.areas[0]?.id || "new")
    }
  }

  function confirmAttach() {
    if (!attachingSketch || !selectedEstimateId) return
    const targetEstimate = estimates?.find((e) => e.id === selectedEstimateId)
    if (!targetEstimate) return
    const client = clients?.find((c) => c.id === targetEstimate.clientId)

    let updatedAreas = [...targetEstimate.areas]
    if (selectedAreaId === "new" || updatedAreas.length === 0) {
      const newArea: AreaInput = {
        id: crypto.randomUUID(),
        name: attachingSketch.title || "Room",
        areaType: "room",
        lengthFt: 12,
        widthFt: 14,
        heightFt: 9,
        crewNote: "",
        surfaces: [],
        sketches: [attachingSketch],
      }
      updatedAreas.push(newArea)
    } else {
      updatedAreas = updatedAreas.map((area) => {
        if (area.id === selectedAreaId) {
          return {
            ...area,
            sketches: [...(area.sketches ?? []), attachingSketch],
          }
        }
        return area
      })
    }

    const draft: EstimateDraft = {
      id: targetEstimate.id,
      clientId: targetEstimate.clientId,
      clientName: client?.name ?? "",
      clientEmail: client?.email ?? "",
      stageId: targetEstimate.stageId,
      title: targetEstimate.title,
      jobAddress: targetEstimate.jobAddress,
      estimateKind: targetEstimate.estimateKind,
      areas: updatedAreas,
      areaGroups: targetEstimate.areaGroups,
      lineItems: targetEstimate.lineItems,
      rates: targetEstimate.rates,
      settings: targetEstimate.settings,
      scheduledOn: targetEstimate.scheduledOn,
      notes: targetEstimate.notes,
      crewNote: targetEstimate.crewNote,
      notesEs: targetEstimate.notesEs,
      crewNoteEs: targetEstimate.crewNoteEs,
      acceptedAt: targetEstimate.acceptedAt,
      publicToken: targetEstimate.publicToken,
      clientStatus: targetEstimate.clientStatus,
      signature: targetEstimate.signature,
      paymentStatus: targetEstimate.paymentStatus,
      depositReceipt: targetEstimate.depositReceipt,
      createdAt: targetEstimate.createdAt,
    }

    saveEstimate(draft)
    persistStandalone(standaloneSketches.filter((s) => s.id !== attachingSketch.id))
    setAttachingSketch(null)
    setNotice(`Attached sketch to ${targetEstimate.jobAddress || client?.name || "estimate"}!`)
    setTimeout(() => setNotice(""), 4000)
  }

  // Also collect any sketches that exist on estimates so everything is visible in one place
  const estimateSketches: AttachedSketch[] = []
  if (Array.isArray(estimates)) {
    for (const est of estimates) {
      const client = clients?.find((c) => c.id === est.clientId)
      const estLabel = est.jobAddress || client?.name || "Estimate"
      for (const area of est.areas) {
        if (area.sketches && area.sketches.length > 0) {
          for (const sk of area.sketches) {
            estimateSketches.push({
              ...sk,
              sourceEstimateName: estLabel,
              sourceRoomName: area.name || "Room",
            })
          }
        }
      }
    }
  }

  const allSketches: AttachedSketch[] = [...standaloneSketches, ...estimateSketches]
  const targetEstimate = estimates?.find((e) => e.id === selectedEstimateId)

  return (
    <div className="flex flex-col gap-6" data-testid="sketches-screen">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Daily Sketch & Notes</h1>
            <span className="rounded-full bg-cyan-50 px-2.5 py-0.5 text-xs font-semibold text-cyan-800 border border-cyan-200">
              {allSketches.length} {allSketches.length === 1 ? "sketch" : "sketches"}
            </span>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Quick phone sketchpad for room layouts, drywall repair marks, handwritten dimensions, and annotated job photos — available anytime without needing an estimate.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/help#sketch-notes"
            className="hidden sm:inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-cyan-700 shadow-xs h-10"
            title="View Sketch & Notes Guide"
          >
            <HelpCircle className="size-3.5 text-cyan-600" />
            <span>Guide</span>
          </Link>
          <Button
            type="button"
            onClick={() => {
              setActiveSketch(null)
              setIsCreating(true)
            }}
            data-testid="new-sketch-button"
            className="h-10 bg-cyan-600 hover:bg-cyan-500 text-white font-semibold gap-1.5"
          >
            <Plus className="size-4" />
            <span>New Sketch</span>
          </Button>
        </div>
      </div>

      {notice ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-medium text-emerald-900 flex items-center gap-2">
          <Check className="size-4 text-emerald-600" />
          <span>{notice}</span>
        </div>
      ) : null}

      {/* Grid of Sketches */}
      {allSketches.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-white p-12 text-center shadow-xs">
          <div className="rounded-full bg-cyan-50 p-4 text-cyan-600 border border-cyan-200">
            <Pencil className="size-8" />
          </div>
          <h2 className="mt-4 text-lg font-semibold text-foreground">No sketches yet</h2>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            Tap below to draw a quick room layout, markup a repair photo, or stamp dimensions on the go.
          </p>
          <div className="mt-6 flex flex-wrap gap-2 justify-center">
            <Button
              type="button"
              onClick={() => {
                setActiveSketch(null)
                setIsCreating(true)
              }}
              className="h-10 bg-cyan-600 hover:bg-cyan-500 text-white font-semibold gap-1.5"
            >
              <Pencil className="size-4" />
              <span>Start First Sketch</span>
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {allSketches.map((sketch) => {
            const isStandalone = !sketch.sourceEstimateName
            return (
              <div
                key={sketch.id}
                className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs transition-all hover:border-cyan-400 hover:shadow-md cursor-pointer"
                onClick={() => setActiveSketch(sketch)}
                data-testid={`sketch-card-${sketch.id}`}
              >
                {/* Thumbnail */}
                <div className="relative aspect-[4/3] w-full overflow-hidden bg-slate-900">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={sketch.imageData}
                    alt={sketch.title || "Sketch"}
                    className="h-full w-full object-cover transition-transform group-hover:scale-102"
                  />
                  <div className="absolute top-2 right-2 flex items-center gap-1">
                    {sketch.backgroundImage ? (
                      <span className="flex items-center gap-1 rounded-full bg-slate-950/80 px-2 py-0.5 text-[10px] font-semibold text-cyan-300 backdrop-blur-xs">
                        <Camera className="size-3" /> Photo
                      </span>
                    ) : null}
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold backdrop-blur-xs ${
                        isStandalone
                          ? "bg-slate-950/80 text-amber-300"
                          : "bg-cyan-950/80 text-cyan-300 border border-cyan-500/40"
                      }`}
                    >
                      {isStandalone ? "Field Note" : `${sketch.sourceRoomName}`}
                    </span>
                  </div>
                </div>

                {/* Details */}
                <div className="flex flex-1 flex-col p-3.5">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold text-sm text-foreground line-clamp-1">{sketch.title || "Untitled Sketch"}</h3>
                  </div>

                  {sketch.roomDimensionsText ? (
                    <p className="mt-1 text-xs text-muted-foreground font-medium">{sketch.roomDimensionsText}</p>
                  ) : null}

                  {sketch.notes ? (
                    <p className="mt-1.5 text-xs text-slate-600 line-clamp-2 bg-slate-50 p-1.5 rounded-lg border border-slate-100">
                      {sketch.notes}
                    </p>
                  ) : null}

                  {sketch.sourceEstimateName ? (
                    <p className="mt-1 text-[11px] text-muted-foreground">Attached to: {sketch.sourceEstimateName}</p>
                  ) : null}

                  <div className="mt-auto pt-3 flex items-center justify-between border-t border-slate-100 text-xs">
                    <span className="text-[11px] text-muted-foreground">
                      {new Date(sketch.updatedAt || sketch.createdAt).toLocaleDateString()}
                    </span>

                    <div className="flex items-center gap-2">
                      {isStandalone && Array.isArray(estimates) && estimates.length > 0 ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            startAttach(sketch)
                          }}
                          className="flex items-center gap-1 text-[11px] font-semibold text-cyan-700 hover:text-cyan-800 bg-cyan-50 hover:bg-cyan-100 px-2 py-1 rounded-md border border-cyan-200"
                          title="Attach to job or estimate"
                        >
                          <Link2 className="size-3" />
                          <span>Attach to Job</span>
                        </button>
                      ) : null}

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDownload(sketch)
                        }}
                        className="text-slate-500 hover:text-foreground p-1"
                        title="Download image"
                      >
                        <Download className="size-3.5" />
                      </button>

                      {isStandalone ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDelete(sketch.id)
                          }}
                          className="text-rose-500 hover:text-rose-700 p-1"
                          title="Delete sketch"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Attach to Estimate Modal */}
      {attachingSketch ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Briefcase className="size-5 text-cyan-600" />
                <h3 className="font-bold text-sm text-foreground">Attach Sketch to Job</h3>
              </div>
              <button type="button" onClick={() => setAttachingSketch(null)} className="text-slate-400 hover:text-slate-600">
                <X className="size-4" />
              </button>
            </div>

            <div className="mt-4 space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Select Job / Estimate</label>
                <select
                  value={selectedEstimateId}
                  onChange={(e) => {
                    const nextId = e.target.value
                    setSelectedEstimateId(nextId)
                    const match = estimates?.find((est) => est.id === nextId)
                    setSelectedAreaId(match?.areas[0]?.id || "new")
                  }}
                  className="w-full h-10 rounded-lg border border-slate-200 bg-white px-2.5 text-xs text-foreground outline-none focus:border-cyan-500"
                >
                  {estimates?.map((est) => {
                    const client = clients?.find((c) => c.id === est.clientId)
                    const label = `${client?.name || "Client"} — ${est.jobAddress || est.title || "Job"}`
                    return (
                      <option key={est.id} value={est.id}>
                        {label}
                      </option>
                    )
                  })}
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Select Room / Area</label>
                <select
                  value={selectedAreaId}
                  onChange={(e) => setSelectedAreaId(e.target.value)}
                  className="w-full h-10 rounded-lg border border-slate-200 bg-white px-2.5 text-xs text-foreground outline-none focus:border-cyan-500"
                >
                  {targetEstimate?.areas.map((area) => (
                    <option key={area.id} value={area.id}>
                      {area.name || "Room"}
                    </option>
                  ))}
                  <option value="new">+ Create New Room for this Sketch</option>
                </select>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <Button type="button" variant="ghost" size="sm" onClick={() => setAttachingSketch(null)}>
                  Cancel
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={confirmAttach}
                  className="bg-cyan-600 hover:bg-cyan-500 text-white font-semibold"
                >
                  Confirm Attachment
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* Sketchpad Modal (Reusing existing RoomSketchpad) */}
      {isCreating || activeSketch ? (
        <RoomSketchpad
          initialSketch={activeSketch}
          onSave={handleSave}
          onClose={() => {
            setIsCreating(false)
            setActiveSketch(null)
          }}
        />
      ) : null}
    </div>
  )
}
