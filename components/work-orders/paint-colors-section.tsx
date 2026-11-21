"use client"

import { useState, useEffect } from "react"
import { Check, Palette, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useScope } from "@/lib/data/store"
import { PAINT_BRANDS, PAINT_SHEENS, type AreaInput, type Estimate } from "@/lib/types"

interface SurfaceColorState {
  id: string
  label: string
  paintBrand: string
  colorCode: string
  colorName: string
  sheen: string
}

interface AreaColorState {
  id: string
  name: string
  paintBrand: string
  colorCode: string
  colorName: string
  sheen: string
  surfaces: SurfaceColorState[]
}

function initializeColorState(areas: AreaInput[]): AreaColorState[] {
  return areas.map((area) => ({
    id: area.id,
    name: area.name,
    paintBrand: area.paintBrand ?? "",
    colorCode: area.colorCode ?? "",
    colorName: area.colorName ?? "",
    sheen: area.sheen ?? "",
    surfaces: area.surfaces.map((surface) => ({
      id: surface.id,
      label: surface.crewNote || surface.productName || "Surface",
      paintBrand: surface.paintBrand ?? area.paintBrand ?? "",
      colorCode: surface.colorCode ?? area.colorCode ?? "",
      colorName: surface.colorName ?? area.colorName ?? "",
      sheen: surface.sheen ?? area.sheen ?? "",
    })),
  }))
}

export function PaintColorsSection({
  estimate,
  readOnly = false,
}: {
  estimate: Estimate
  readOnly?: boolean
}) {
  const scope = useScope()
  const [areaStates, setAreaStates] = useState<AreaColorState[]>(() =>
    initializeColorState(estimate.areas),
  )
  const [savedNotice, setSavedNotice] = useState(false)
  const [saving, setSaving] = useState(false)

  // Sync if estimate.areas changes from external updates
  useEffect(() => {
    setAreaStates(initializeColorState(estimate.areas))
  }, [estimate.areas])

  const handleAreaChange = (
    areaId: string,
    field: keyof Omit<AreaColorState, "id" | "name" | "surfaces">,
    value: string,
  ) => {
    setAreaStates((prev) =>
      prev.map((a) => (a.id === areaId ? { ...a, [field]: value } : a)),
    )
  }

  const handleApplyToAllSurfaces = (areaId: string) => {
    setAreaStates((prev) =>
      prev.map((a) => {
        if (a.id !== areaId) return a
        return {
          ...a,
          surfaces: a.surfaces.map((s) => ({
            ...s,
            paintBrand: a.paintBrand || s.paintBrand,
            colorCode: a.colorCode || s.colorCode,
            colorName: a.colorName || s.colorName,
            sheen: a.sheen || s.sheen,
          })),
        }
      }),
    )
  }

  const handleSurfaceChange = (
    areaId: string,
    surfaceId: string,
    field: keyof Omit<SurfaceColorState, "id" | "label">,
    value: string,
  ) => {
    setAreaStates((prev) =>
      prev.map((a) => {
        if (a.id !== areaId) return a
        return {
          ...a,
          surfaces: a.surfaces.map((s) =>
            s.id === surfaceId ? { ...s, [field]: value } : s,
          ),
        }
      }),
    )
  }

  const handleSave = () => {
    setSaving(true)
    const payload = areaStates.map((a) => ({
      areaId: a.id,
      paintBrand: a.paintBrand,
      colorCode: a.colorCode,
      colorName: a.colorName,
      sheen: a.sheen,
      surfaces: a.surfaces.map((s) => ({
        surfaceId: s.id,
        paintBrand: s.paintBrand,
        colorCode: s.colorCode,
        colorName: s.colorName,
        sheen: s.sheen,
      })),
    }))

    scope.updateJobColors(estimate.id, payload)
    setSaving(false)
    setSavedNotice(true)
    setTimeout(() => setSavedNotice(false), 3000)
  }

  if (estimate.areas.length === 0) {
    return null
  }

  return (
    <section
      data-testid="paint-colors-section"
      className="space-y-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6 text-slate-900"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div className="flex items-center gap-2.5">
          <span className="flex size-9 items-center justify-center rounded-xl bg-sky-100 text-sky-700">
            <Palette className="size-5" />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-900">Paint &amp; Colors</h2>
              <span className="rounded-full bg-sky-50 border border-sky-200 px-2.5 py-0.5 text-[11px] font-semibold text-sky-700">
                Color Approval
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Specify paint brand, color code, color name, and sheen for each room and surface.
            </p>
          </div>
        </div>

        {!readOnly ? (
          <div className="flex items-center gap-2">
            {savedNotice ? (
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 animate-fade-in">
                <Check className="size-3.5" /> Saved
              </span>
            ) : null}
            <Button
              type="button"
              size="sm"
              onClick={handleSave}
              disabled={saving}
              className="h-9 px-4 font-semibold shadow-xs"
              data-testid="save-job-colors"
            >
              {saving ? "Saving..." : "Save Colors"}
            </Button>
          </div>
        ) : null}
      </div>

      <div className="space-y-6">
        {areaStates.map((area) => (
          <div
            key={area.id}
            data-testid={`paint-area-${area.id}`}
            className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 sm:p-5 space-y-4"
          >
            {/* Room Header & Room-level Defaults */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">{area.name}</h3>
                <p className="text-[11px] text-slate-500">
                  {area.surfaces.length} {area.surfaces.length === 1 ? "surface" : "surfaces"} in this room
                </p>
              </div>

              {!readOnly && area.surfaces.length > 0 ? (
                <button
                  type="button"
                  onClick={() => handleApplyToAllSurfaces(area.id)}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-sky-700 hover:text-sky-800 bg-sky-50 hover:bg-sky-100 border border-sky-200 px-2.5 py-1 rounded-lg transition-colors"
                  title="Copy room defaults to all surfaces below"
                >
                  <Sparkles className="size-3.5" />
                  <span>Apply Room Defaults to Surfaces</span>
                </button>
              ) : null}
            </div>

            {/* Room Default Controls */}
            <div className="rounded-lg bg-white p-3.5 border border-slate-200/80 shadow-2xs space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
                Room Defaults (Optional)
              </span>
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
                <div className="space-y-1">
                  <Label htmlFor={`room-brand-${area.id}`} className="text-xs font-medium text-slate-700">
                    Paint Brand
                  </Label>
                  <select
                    id={`room-brand-${area.id}`}
                    value={area.paintBrand}
                    disabled={readOnly}
                    onChange={(e) => handleAreaChange(area.id, "paintBrand", e.target.value)}
                    className="h-9 w-full rounded-lg border border-slate-300 bg-white px-2 text-xs font-medium text-slate-900 shadow-2xs focus:border-sky-500 focus:outline-none"
                  >
                    <option value="">Select Brand</option>
                    {PAINT_BRANDS.map((brand) => (
                      <option key={brand} value={brand}>
                        {brand}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <Label htmlFor={`room-code-${area.id}`} className="text-xs font-medium text-slate-700">
                    Color Code
                  </Label>
                  <Input
                    id={`room-code-${area.id}`}
                    placeholder="e.g. SW 7028"
                    value={area.colorCode}
                    disabled={readOnly}
                    className="h-9 text-xs"
                    onValueChange={(val) => handleAreaChange(area.id, "colorCode", val)}
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor={`room-name-${area.id}`} className="text-xs font-medium text-slate-700">
                    Color Name
                  </Label>
                  <Input
                    id={`room-name-${area.id}`}
                    placeholder="e.g. Agreeable Gray"
                    value={area.colorName}
                    disabled={readOnly}
                    className="h-9 text-xs"
                    onValueChange={(val) => handleAreaChange(area.id, "colorName", val)}
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor={`room-sheen-${area.id}`} className="text-xs font-medium text-slate-700">
                    Sheen
                  </Label>
                  <select
                    id={`room-sheen-${area.id}`}
                    value={area.sheen}
                    disabled={readOnly}
                    onChange={(e) => handleAreaChange(area.id, "sheen", e.target.value)}
                    className="h-9 w-full rounded-lg border border-slate-300 bg-white px-2 text-xs font-medium text-slate-900 shadow-2xs focus:border-sky-500 focus:outline-none"
                  >
                    <option value="">Select Sheen</option>
                    {PAINT_SHEENS.map((sheen) => (
                      <option key={sheen} value={sheen}>
                        {sheen}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Surface List */}
            {area.surfaces.length > 0 ? (
              <div className="space-y-2.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
                  Surface Color Selections
                </span>
                <div className="space-y-2">
                  {area.surfaces.map((surface) => (
                    <div
                      key={surface.id}
                      data-testid={`surface-row-${surface.id}`}
                      className="rounded-lg border border-slate-200 bg-white p-3 space-y-2 shadow-2xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-900 capitalize">
                          {surface.label}
                        </span>
                        {(surface.colorName || surface.colorCode) ? (
                          <span className="text-[11px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                            {[surface.paintBrand, surface.colorCode, surface.colorName, surface.sheen]
                              .filter(Boolean)
                              .join(" · ")}
                          </span>
                        ) : (
                          <span className="text-[11px] text-slate-400 italic">Not set</span>
                        )}
                      </div>

                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
                        <div>
                          <Label htmlFor={`brand-${surface.id}`} className="text-[11px] text-slate-500">
                            Brand
                          </Label>
                          <select
                            id={`brand-${surface.id}`}
                            value={surface.paintBrand}
                            disabled={readOnly}
                            onChange={(e) =>
                              handleSurfaceChange(area.id, surface.id, "paintBrand", e.target.value)
                            }
                            className="mt-0.5 h-8 w-full rounded-md border border-slate-300 bg-white px-2 text-xs text-slate-900 focus:border-sky-500 focus:outline-none"
                          >
                            <option value="">Select Brand</option>
                            {PAINT_BRANDS.map((brand) => (
                              <option key={brand} value={brand}>
                                {brand}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <Label htmlFor={`code-${surface.id}`} className="text-[11px] text-slate-500">
                            Color Code
                          </Label>
                          <Input
                            id={`code-${surface.id}`}
                            placeholder="e.g. SW 7028"
                            value={surface.colorCode}
                            disabled={readOnly}
                            className="mt-0.5 h-8 text-xs"
                            onValueChange={(val) =>
                              handleSurfaceChange(area.id, surface.id, "colorCode", val)
                            }
                          />
                        </div>

                        <div>
                          <Label htmlFor={`name-${surface.id}`} className="text-[11px] text-slate-500">
                            Color Name
                          </Label>
                          <Input
                            id={`name-${surface.id}`}
                            placeholder="e.g. Agreeable Gray"
                            value={surface.colorName}
                            disabled={readOnly}
                            className="mt-0.5 h-8 text-xs"
                            onValueChange={(val) =>
                              handleSurfaceChange(area.id, surface.id, "colorName", val)
                            }
                          />
                        </div>

                        <div>
                          <Label htmlFor={`sheen-${surface.id}`} className="text-[11px] text-slate-500">
                            Sheen
                          </Label>
                          <select
                            id={`sheen-${surface.id}`}
                            value={surface.sheen}
                            disabled={readOnly}
                            onChange={(e) =>
                              handleSurfaceChange(area.id, surface.id, "sheen", e.target.value)
                            }
                            className="mt-0.5 h-8 w-full rounded-md border border-slate-300 bg-white px-2 text-xs text-slate-900 focus:border-sky-500 focus:outline-none"
                          >
                            <option value="">Select Sheen</option>
                            {PAINT_SHEENS.map((sheen) => (
                              <option key={sheen} value={sheen}>
                                {sheen}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        ))}
      </div>

      {!readOnly && areaStates.length > 1 ? (
        <div className="flex justify-end pt-2 border-t border-slate-100">
          <Button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="h-10 px-5 font-semibold shadow-xs"
          >
            {saving ? "Saving..." : "Save All Colors"}
          </Button>
        </div>
      ) : null}
    </section>
  )
}
