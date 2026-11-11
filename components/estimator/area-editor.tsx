"use client"
import { useEffect, useState } from "react"
import { useTypedNumber } from "@/hooks/use-typed-number"
import { AreaNamesDialog } from "@/components/estimator/area-names-dialog"
import { OneOffRateForm } from "@/components/estimator/one-off-rate"
import { TemplatePicker } from "@/components/estimator/template-picker"
import { addAreaName, type AreaName } from "@/lib/estimate/area-names"
import { copyArea, insertAfter } from "@/lib/estimate/copy"
import { measureArea, measuredQuantity, openingSqFt, quantityUnit, roomGallonsEstimate, surfaceGallonsEstimate } from "@/lib/estimate/calculate"
import {
  createAreaGroup,
  moveAreaGroup,
  placeArea,
  removeAreaGroup,
  renameAreaGroup,
  sectionByGroup,
} from "@/lib/estimate/groups"
import { ratesForKind } from "@/lib/estimate/kinds"
import { quickRoom } from "@/lib/estimate/quick-room"
import { areaFromTemplate, areaTemplatesFor } from "@/lib/estimate/templates"
import { attachOneOffRate, detachRateSurface } from "@/lib/estimate/one-off"
import {
  SUBSTRATE_LABEL,
  applySubstrate,
  sameSubstrateGroup,
  substrateChoices,
  substrateOf,
  surfaceHeads,
} from "@/lib/estimate/substrate"
import type { SavedEstimateTemplate } from "@/lib/estimate/saved-templates"
import { PAINT_BRANDS, PAINT_SHEENS, type AreaGroup, type AreaInput, type AreaOpening, type EstimateKind, type LineItemInput, type ProductionRate, type Substrate, type SurfaceInput } from "@/lib/types"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
function withBlankDimensions(room: AreaInput): AreaInput {
  return {
    ...room,
    lengthFt: 0,
    widthFt: 0,
    heightFt: 0,
    surfaces: room.surfaces.map((surface) => ({ ...surface, itemCount: 0 })),
  }
}

export function AreaEditor({
areas,
areaGroups,
rates,
kind,
savedTemplates,
onDeleteSaved,
onSaveTemplate,
areaNames,
onAreaNames,
onChange,
onGroups,
onDuplicate,
}: {
  areas: AreaInput[]
  areaGroups: AreaGroup[]
  rates: ProductionRate[]
  kind: EstimateKind
  savedTemplates: SavedEstimateTemplate[]
  onDeleteSaved: (id: string) => void
  onSaveTemplate: () => void
  areaNames: AreaName[]
  onAreaNames: (names: AreaName[]) => void
  onChange: (
areas: AreaInput[],
title?: string,
lineItems?: LineItemInput[],
rates?: ProductionRate[],
kind?: EstimateKind,
  ) => void
  onGroups: (groups: AreaGroup[]) => void
  onDuplicate: (areas: AreaInput[]) => void
}) {
const [templatesOpen, setTemplatesOpen] = useState(false)
const [namesOpen, setNamesOpen] = useState(false)
const [roomDraft, setRoomDraft] = useState("")
const [focusAreaId, setFocusAreaId] = useState<string | null>(null)
const addRoom = (name: string) => {
const room = quickRoom(name, kind)
    if (!room) return
    const blank = withBlankDimensions(room)
    onChange([...areas, blank])
    setRoomDraft("")
    setFocusAreaId(blank.id)
  }
const [groupDraft, setGroupDraft] = useState("")
const [groupError, setGroupError] = useState<string | null>(null)
const sections = sectionByGroup(areas, areaGroups, (area) => area.groupId, { includeEmpty: true })
const addGroup = () => {
const group = createAreaGroup(groupDraft)
    if (!group) {
      setGroupError("Enter a group name, such as Upstairs.")
      return
    }
    onGroups([...areaGroups, group])
    setGroupDraft("")
    setGroupError(null)
  }
  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-xs font-semibold tracking-[0.14em] text-muted-foreground uppercase">
          Areas
        </h2>
        <div className="flex flex-wrap justify-end gap-x-3 gap-y-1">
          <button
            type="button"
            className="text-sm font-medium text-primary"
            data-testid="save-template"
            onClick={onSaveTemplate}
          >
            Save as template
          </button>
          <button
            type="button"
            className="text-sm font-medium text-primary"
            data-testid="open-templates"
            onClick={() => setTemplatesOpen(true)}
          >
            Templates
          </button>
          <button
            type="button"
            className="text-sm font-medium text-primary"
            data-testid="open-area-names"
            onClick={() => setNamesOpen(true)}
          >
            Area names
          </button>
        </div>
      </div>
      <div className="rounded-2xl bg-card p-3 border border-slate-200 bg-white shadow-sm" data-testid="add-room">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <div className="grid min-w-0 flex-1 gap-1">
            <Label htmlFor="add-room-name">Add a room</Label>
            <Input
              id="add-room-name"
              data-testid="add-room-name"
              value={roomDraft}
              placeholder="Bedroom, Kitchen, North wall"
              className="h-11"
              onValueChange={setRoomDraft}
              onKeyDown={(event) => {
                if (event.key !== "Enter") return
                event.preventDefault()
                addRoom(roomDraft)
              }}
            />
          </div>
          <button
            type="button"
            data-testid="add-room-button"
            className="h-11 rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground"
            onClick={() => addRoom(roomDraft)}
          >
            Add
          </button>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {areaTemplatesFor(kind).slice(0, 8).map((template) => (
            <button
              key={template.id}
              type="button"
              data-testid={`add-room-${template.id}`}
              className="rounded-full bg-muted px-3 py-1.5 text-sm"
              onClick={() => {
                const room = areaFromTemplate(template.id)
                if (!room) return
                const blank = withBlankDimensions(room)
                onChange([...areas, blank])
                setFocusAreaId(blank.id)
              }}
            >
              {template.name}
            </button>
          ))}
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Type a name and press Enter. A known room brings its size and surfaces. A new name starts with walls, ceiling, and trim so the price moves as you type the size.
        </p>
      </div>
      <details className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
        <summary className="cursor-pointer text-sm font-medium text-primary">Organize rooms into groups (optional)</summary>
      <div className="rounded-2xl bg-card p-3 border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <div className="grid min-w-0 flex-1 gap-1">
            <Label htmlFor="new-group-name">New group</Label>
            <Input
              id="new-group-name"
              data-testid="new-group-name"
              value={groupDraft}
              placeholder="Upstairs, Front of the house"
              className="h-11"
              onValueChange={(value) => {
                setGroupDraft(value)
                setGroupError(null)
              }}
              onKeyDown={(event) => {
                if (event.key !== "Enter") return
                event.preventDefault()
                addGroup()
              }}
            />
          </div>
          <button
            type="button"
            data-testid="add-group"
            className="h-11 rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground"
            onClick={addGroup}
          >
            Add group
          </button>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Groups such as Upstairs or Front of the house keep those rooms together on the proposal and the crew sheet. Hours and the price stay the same.
        </p>
        {groupError ? <p className="mt-2 text-sm text-destructive">{groupError}</p> : null}
      </div>
      </details>
      <AreaNamesDialog
        open={namesOpen}
        names={areaNames}
        onOpenChange={setNamesOpen}
        onNames={onAreaNames}
        onAdd={(area) => {
          const areaId = areas.some((a) => a.id === area.id) ? crypto.randomUUID() : area.id
          onChange([...areas, { ...area, id: areaId }])
        }}
      />
      <TemplatePicker
        open={templatesOpen}
        savedTemplates={savedTemplates}
        onDeleteSaved={onDeleteSaved}
        onOpenChange={setTemplatesOpen}
        onAdd={(next, title, lineItems, groups, nextKind) => {
          const existingIds = new Set(areas.map((a) => a.id))
          const deduplicatedNext = next.map((a) =>
            existingIds.has(a.id)
              ? {
                  ...a,
                  id: crypto.randomUUID(),
                  surfaces: a.surfaces.map((s) => ({ ...s, id: crypto.randomUUID() })),
                }
              : a,
          )
          onChange([...areas, ...deduplicatedNext], title, lineItems, undefined, nextKind)
          if (groups && groups.length > 0) onGroups([...areaGroups, ...groups])
        }}
      />
      {areas.length === 0 && areaGroups.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border px-4 py-6 text-sm text-muted-foreground">
          Type a room above, or open Templates for a whole interior or exterior job.
        </p>
      ) : null}
      {sections.map((section) => {
const groupIndex = section.groupId ? areaGroups.findIndex((group) => group.id === section.groupId) : -1
const showUngroupedLabel = section.groupId === null && areaGroups.length > 0 && section.items.length > 0
        return (
          <div key={section.groupId ?? "ungrouped"} className="flex flex-col gap-3">
            {section.groupId ? (
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end" data-testid="group-section">
                <div className="grid min-w-0 flex-1 gap-1">
                  <Label htmlFor={`group-${section.groupId}`}>Group</Label>
                  <Input
                    id={`group-${section.groupId}`}
                    aria-label="Group name"
                    data-testid="group-name"
                    value={areaGroups[groupIndex]?.name ?? ""}
                    className="h-11"
                    onValueChange={(name) => onGroups(renameAreaGroup(areaGroups, section.groupId!, name))}
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="h-11 px-2 text-sm font-medium text-primary disabled:opacity-40"
                    data-testid="group-up"
                    disabled={groupIndex <= 0}
                    onClick={() => onGroups(moveAreaGroup(areaGroups, section.groupId!, -1))}
                  >
                    Move up
                  </button>
                  <button
                    type="button"
                    className="h-11 px-2 text-sm font-medium text-primary disabled:opacity-40"
                    data-testid="group-down"
                    disabled={groupIndex < 0 || groupIndex >= areaGroups.length - 1}
                    onClick={() => onGroups(moveAreaGroup(areaGroups, section.groupId!, 1))}
                  >
                    Move down
                  </button>
                  <button
                    type="button"
                    className="h-11 px-2 text-sm text-muted-foreground"
                    data-testid="remove-group"
                    onClick={() => {
const removed = removeAreaGroup(areaGroups, areas, section.groupId!)
                      onChange(removed.areas)
                      onGroups(removed.groups)
                    }}
                  >
                    Remove group
                  </button>
                </div>
              </div>
            ) : null}
            {showUngroupedLabel ? (
              <p className="text-xs font-semibold tracking-[0.14em] text-muted-foreground uppercase">Not in a group</p>
            ) : null}
            {section.groupId && section.items.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-border px-4 py-4 text-sm text-muted-foreground">
                No rooms in this group yet. Choose it from a room's Group menu.
              </p>
            ) : null}
            {section.items.map((area) => (
              <AreaCard
                key={area.id}
                area={area}
                kind={kind}
                rates={ratesForArea(rates, kind, area)}
                areaNames={areaNames}
                areaGroups={areaGroups}
                focusLength={focusAreaId === area.id}
                onFocused={() => setFocusAreaId(null)}
                onKeepName={(name) => {
const next = addAreaName(areaNames, name)
                  if (next) onAreaNames(next)
                }}
                onChange={(next) => onChange(areas.map((item) => (item.id === area.id ? next : item)))}
                onPlace={(groupId) => onChange(placeArea(areas, area.id, groupId))}
                onCopy={() => onDuplicate(insertAfter(areas, area.id, copyArea(area)))}
                onRemove={() => {
const nextAreas = areas.filter((item) => item.id !== area.id)
const used = new Set(nextAreas.flatMap((item) => item.surfaces.map((surface) => surface.rateId)))
const nextRates = rates.filter((rate) => !rate.oneOff || used.has(rate.id))
                  onChange(nextAreas, undefined, undefined, nextRates)
                }}
                onApplyOneOff={(rate) => {
const next = attachOneOffRate(areas, area.id, rates, rate)
                  onChange(next.areas, undefined, undefined, next.rates)
                }}
                onToggleOneOff={(rate) => {
const on = area.surfaces.some((surface) => surface.rateId === rate.id)
const next = on
                    ? detachRateSurface(areas, area.id, rates, rate.id)
                    : attachOneOffRate(areas, area.id, rates, rate)
                  onChange(next.areas, undefined, undefined, next.rates)
                }}
              />
            ))}
          </div>
        )
      })}
    </section>
  )
}
function AreaCard({
area,
kind,
rates,
areaNames,
areaGroups,
focusLength,
onFocused,
onKeepName,
onChange,
onPlace,
onCopy,
onRemove,
onApplyOneOff,
onToggleOneOff,
}: {
  area: AreaInput
  kind: EstimateKind
  rates: ProductionRate[]
  areaNames: AreaName[]
  areaGroups: AreaGroup[]
  focusLength: boolean
  onFocused: () => void
  onKeepName: (name: string) => void
  onChange: (area: AreaInput) => void
  onPlace: (groupId: string | null) => void
  onCopy: () => void
  onRemove: () => void
  onApplyOneOff: (rate: ProductionRate) => void
  onToggleOneOff: (rate: ProductionRate) => void
}) {
  useEffect(() => {
    if (!focusLength) return
    document.getElementById(`${area.id}-length`)?.focus()
    onFocused()
  }, [focusLength, area.id, onFocused])
const measures = measureArea(area)
const roomGallons = roomGallonsEstimate(area, rates)
const updateSurface = (surface: SurfaceInput, patch: Partial<SurfaceInput>) => {
    onChange({
      ...area,
      surfaces: area.surfaces.map((item) => (item.id === surface.id ? { ...item, ...patch } : item)),
    })
  }
const toggle = (rate: ProductionRate) => {
    if (rate.oneOff) {
      onToggleOneOff(rate)
      return
    }
const existing = area.surfaces.find((surface) => sameSubstrateGroup(rates, surface, rate))
const surfaces = existing
      ? area.surfaces.filter((surface) => !sameSubstrateGroup(rates, surface, rate))
      : [
          ...area.surfaces,
          {
            id: crypto.randomUUID(),
            rateId: rate.id,
            coatCount: rate.coatRates[rate.coatRates.length - 1]?.coats ?? 2,
            itemCount: 0,
            quantityOverride: null,
            hoursOverride: null,
            crewNote: "",
            substrate: "drywall",
          } satisfies SurfaceInput,
        ]
    onChange({ ...area, surfaces })
  }
  return (
    <details className="rounded-2xl border border-slate-200 bg-white shadow-sm" open={focusLength ? true : undefined}>
      <summary className="cursor-pointer list-item px-4 py-4 text-sm font-semibold text-foreground">
        <span>{area.name || "Untitled room"}</span>
        <span className="ml-2 text-xs font-normal text-muted-foreground">{area.lengthFt} × {area.widthFt} × {area.heightFt} ft · {area.surfaces.length} surfaces</span>
        <span className="ml-2 inline-flex items-center rounded-full bg-cyan-500/10 px-2 py-0.5 text-xs font-bold text-cyan-700 dark:text-cyan-300" data-testid={`room-gallons-${area.id}`}>
          {roomGallons} gal
        </span>
        <span className="ml-auto text-xs font-medium text-primary">Edit room</span>
      </summary>
      <div className="border-t border-border p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="grid flex-1 gap-2">
          <Label htmlFor={`${area.id}-name`}>Area</Label>
          <Input
            id={`${area.id}-name`}
            value={area.name}
            list={`${area.id}-name-list`}
            className="h-11"
            onValueChange={(name) => onChange({ ...area, name })}
          />
          <datalist id={`${area.id}-name-list`}>
            {areaNames.map((item) => (
              <option key={item.id} value={item.name} />
            ))}
          </datalist>
          {area.name.trim() && !areaNames.some((item) => item.name.trim().toLowerCase() === area.name.trim().toLowerCase()) ? (
            <button type="button" className="text-left text-sm font-medium text-primary" onClick={() => onKeepName(area.name)}>
              Keep this name
            </button>
          ) : null}
        </div>
        <div className="flex shrink-0 gap-3">
          <button type="button" className="text-sm font-medium text-primary" data-testid="copy-area" onClick={onCopy}>
            Duplicate
          </button>
          <button type="button" className="text-sm text-muted-foreground" onClick={onRemove}>
            Remove
          </button>
        </div>
      </div>
      {areaGroups.length > 0 ? (
        <div className="mt-3 grid gap-1">
          <Label htmlFor={`${area.id}-group`}>Group</Label>
          <select
            id={`${area.id}-group`}
            data-testid="area-group"
            className="h-11 rounded-lg border border-input bg-transparent px-2"
            value={area.groupId && areaGroups.some((group) => group.id === area.groupId) ? area.groupId : ""}
            onChange={(event) => onPlace(event.target.value || null)}
          >
            <option value="">Not in a group</option>
            {areaGroups.map((group) => (
              <option key={group.id} value={group.id}>
                {group.name.trim() || "Group"}
              </option>
            ))}
          </select>
        </div>
      ) : null}
      <div className="mt-3 flex gap-2">
        {(["room", "surface"] as const).map((areaType) => (
          <button
            key={areaType}
            type="button"
            onClick={() => onChange({ ...area, areaType })}
            className={
area.areaType === areaType
                ? "rounded-full bg-primary px-3 py-1.5 text-sm text-primary-foreground"
                : "rounded-full bg-muted px-3 py-1.5 text-sm"
            }
          >
            {areaType === "room" ? "Room" : "Single surface"}
          </button>
        ))}
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2">
        <NumberField
          id={`${area.id}-length`}
          label="Length"
          value={area.lengthFt}
          onChange={(lengthFt) => onChange({ ...area, lengthFt })}
        />
        <NumberField
          id={`${area.id}-width`}
          label="Width"
          value={area.widthFt}
          onChange={(widthFt) => onChange({ ...area, widthFt })}
        />
        <NumberField
          id={`${area.id}-height`}
          label="Height"
          value={area.heightFt}
          onChange={(heightFt) => onChange({ ...area, heightFt })}
        />
      </div>
      <p className="mt-2 text-xs text-muted-foreground" data-testid="area-measures">
        {measures.wallSqFt} sq ft walls
        {openingSqFt(area.openings) > 0 ? ` after leaving out ${openingSqFt(area.openings)} sq ft of doors and windows` : ""}
        {" · "}
        {measures.ceilingSqFt} sq ft ceiling · {measures.perimeterLnFt} ln ft trim · <span className="font-semibold text-foreground">{roomGallons} gal</span>
      </p>
      {kind === "interior" && area.areaType === "room" ? (
        <details className="mt-3 rounded-xl border border-border p-3" open={undefined}>
          <summary className="cursor-pointer text-sm font-medium">Doors & windows {area.openings?.length ? `(${area.openings.length})` : "(optional)"}</summary>
          <RoomOpenings area={area} onChange={onChange} />
        </details>
      ) : null}
      <details className="mt-3 rounded-xl border border-border p-3">
        <summary className="cursor-pointer text-sm font-medium">Paint color & sheen (optional)</summary>
      <div className="mt-3 grid gap-2 sm:grid-cols-4">
        <div className="grid gap-1">
          <Label htmlFor={`${area.id}-brand`}>Paint brand</Label>
          <select
            id={`${area.id}-brand`}
            data-testid={`paint-brand-${area.id}`}
            className="h-11 rounded-lg border border-input bg-transparent px-2 text-sm"
            value={area.paintBrand ?? ""}
            onChange={(event) => onChange({ ...area, paintBrand: event.target.value })}
          >
            <option value="">Not specified</option>
            {PAINT_BRANDS.map((brand) => (
              <option key={brand} value={brand}>
                {brand}
              </option>
            ))}
          </select>
        </div>
        <div className="grid gap-1">
          <Label htmlFor={`${area.id}-color`}>Color name</Label>
          <Input
            id={`${area.id}-color`}
            data-testid={`color-name-${area.id}`}
            value={area.colorName ?? ""}
            placeholder="Agreeable Gray"
            className="h-11"
            onValueChange={(colorName) => onChange({ ...area, colorName })}
          />
        </div>
        <div className="grid gap-1">
          <Label htmlFor={`${area.id}-color-code`}>Color code</Label>
          <Input
            id={`${area.id}-color-code`}
            data-testid={`color-code-${area.id}`}
            value={area.colorCode ?? ""}
            placeholder="SW 7028"
            className="h-11"
            onValueChange={(colorCode) => onChange({ ...area, colorCode })}
          />
        </div>
        <div className="grid gap-1">
          <Label htmlFor={`${area.id}-sheen`}>Sheen</Label>
          <select
            id={`${area.id}-sheen`}
            data-testid={`sheen-${area.id}`}
            className="h-11 rounded-lg border border-input bg-transparent px-2 text-sm"
            value={area.sheen ?? ""}
            onChange={(event) => onChange({ ...area, sheen: event.target.value })}
          >
            <option value="">Not specified</option>
            {PAINT_SHEENS.map((sheen) => (
              <option key={sheen} value={sheen}>
                {sheen}
              </option>
            ))}
          </select>
        </div>
      </div>
      </details>
      <details className="mt-3 rounded-xl border border-border p-3">
        <summary className="cursor-pointer text-sm font-medium">Prep, repairs & access (advanced)</summary>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <div className="grid gap-1">
          <Label htmlFor={`${area.id}-prep`}>Prep intensity</Label>
          <select
            id={`${area.id}-prep`}
            className="h-11 rounded-lg border border-input bg-transparent px-2"
            value={area.prepLevel ?? "none"}
            onChange={(event) =>
              onChange({ ...area, prepLevel: event.target.value as "none" | "light" | "medium" | "heavy" })
            }
          >
            <option value="none">None</option>
            <option value="light">Light</option>
            <option value="medium">Medium</option>
            <option value="heavy">Heavy</option>
          </select>
        </div>
        <NumberField
          id={`${area.id}-prep-hours`}
          label="Prep hours"
          value={area.prepHours ?? 0}
          onChange={(prepHours) => onChange({ ...area, prepHours: prepHours > 0 ? prepHours : null })}
        />
        <NumberField
          id={`${area.id}-repair-hours`}
          label="Repair hours"
          value={area.repairHours ?? 0}
          onChange={(repairHours) => onChange({ ...area, repairHours: repairHours > 0 ? repairHours : null })}
        />
        <div className="grid gap-1">
          <Label htmlFor={`${area.id}-access`}>Access multiplier</Label>
          <select
            id={`${area.id}-access`}
            className="h-11 rounded-lg border border-input bg-transparent px-2"
            value={accessPreset(area.accessFactor)}
            onChange={(event) => {
const preset = event.target.value
              if (preset === "1") onChange({ ...area, accessFactor: 1 })
              else if (preset === "1.25") onChange({ ...area, accessFactor: 1.25 })
              else onChange({ ...area, accessFactor: customAccess(area.accessFactor) })
            }}
          >
            <option value="1">Standard (1.0)</option>
            <option value="1.25">High ladder (1.25)</option>
            <option value="custom">Custom</option>
          </select>
          {accessPreset(area.accessFactor) === "custom" ? (
            <NumberField
              id={`${area.id}-access-custom`}
              label="Custom multiplier"
              value={area.accessFactor ?? 1}
              onChange={(accessFactor) =>
                onChange({ ...area, accessFactor: accessFactor > 0 ? accessFactor : 1 })
              }
            />
          ) : null}
        </div>
      </div>
      </details>
      <details className="mt-4 rounded-xl border border-border p-3">
        <summary className="cursor-pointer text-sm font-medium">
          Painting surfaces ({area.surfaces.length} selected)
        </summary>
      <div className="mt-2 flex flex-col gap-3">
        {rateGroups(surfaceHeads(rates)).map((group) => (
          <div key={group.category} className="flex flex-col gap-2">
            <p className="text-xs font-medium text-muted-foreground">{group.category}</p>
            {group.rates.map((rate) => {
const surface = area.surfaces.find((item) => sameSubstrateGroup(rates, item, rate))
const active = (surface && rates.find((item) => item.id === surface.rateId)) || rate
const choices = substrateChoices(rates, rate)
const chosen = surface?.substrate ?? substrateOf(active)
const unit = quantityUnit(active)
const roomQuantity = measuredQuantity(active, area, surface?.itemCount ?? 0)
const surfaceGallons = surface ? surfaceGallonsEstimate(area, surface, active) : null
              return (
                <div key={rate.id} className="flex flex-col gap-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <button type="button" className="flex items-center gap-2 text-left text-sm font-medium" onClick={() => toggle(rate)}>
                      <span className={surface ? "" : "text-muted-foreground"}>{rate.internalLabel}</span>
                      {surface && surfaceGallons !== null ? (
                        <span
                          className="inline-flex items-center rounded-md bg-cyan-100 px-2 py-0.5 text-xs font-bold text-cyan-900 dark:bg-cyan-950 dark:text-cyan-200"
                          data-testid={`gallons-${rate.id}`}
                        >
                          {surfaceGallons} gal
                        </span>
                      ) : null}
                      {rate.oneOff ? (
                        <span className="mt-0.5 block text-xs font-normal text-muted-foreground">This job only</span>
                      ) : null}
                    </button>
                    {surface ? (
                      <div className="flex flex-wrap items-center gap-2">
                        {choices.length > 1 ? (
                          <label className="text-xs text-muted-foreground">
                            Substrate
                            <select
                              className="ml-1 h-10 rounded-lg border border-input bg-transparent px-2"
                              data-testid={`substrate-${rate.id}`}
                              aria-label={`${rate.internalLabel} substrate`}
                              value={chosen}
                              onChange={(event) => {
const substrate = event.target.value as Substrate
                                onChange({
                                  ...area,
                                  surfaces: area.surfaces.map((item) =>
                                    item.id === surface.id ? applySubstrate(item, rates, substrate) : item,
                                  ),
                                })
                              }}
                            >
                              {choices.map((substrate) => (
                                <option key={substrate} value={substrate}>
                                  {SUBSTRATE_LABEL[substrate]}
                                </option>
                              ))}
                            </select>
                          </label>
                        ) : null}
                        {active.measure === "items" || active.measure === "shutters" ? (
                          <Input
                            aria-label={`${rate.internalLabel} count`}
                            placeholder="0"
                            value={surface.itemCount === 0 ? "" : String(surface.itemCount)}
                            className="h-10 w-16 text-center"
                            onValueChange={(value) =>
                              updateSurface(surface, { itemCount: Number(value) || 0 })
                            }
                          />
                        ) : null}
                        <label className="text-xs text-muted-foreground">
                          Primer
                          <select
                            className="ml-1 h-10 rounded-lg border border-input bg-transparent px-2"
                            value={surface.primerCoats ?? 0}
                            onChange={(event) =>
                              updateSurface(surface, { primerCoats: Number(event.target.value) })
                            }
                          >
                            {[0, 1, 2, 3].map((coats) => (
                              <option key={coats} value={coats}>
                                {coats}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className="text-xs text-muted-foreground">
                          Finish
                          <select
                            className="ml-1 h-10 rounded-lg border border-input bg-transparent px-2"
                            data-testid={`finish-coats-${rate.id}`}
                            aria-label={`${rate.internalLabel} finish coats`}
                            value={surface.finishCoats ?? surface.coatCount}
                            onChange={(event) =>
                              updateSurface(surface, {
                                coatCount: Number(event.target.value),
                                finishCoats: Number(event.target.value),
                              })
                            }
                          >
                            {finishCoatChoices(active, surface.finishCoats ?? surface.coatCount).map((coats) => (
                              <option key={coats} value={coats}>
                                {coats}
                              </option>
                            ))}
                          </select>
                        </label>
                      </div>
                    ) : null}
                  </div>
                  {surface ? (
                    <div className="flex flex-col gap-2">
                    {chosen !== substrateOf(active) ? (
                      <p className="text-xs text-muted-foreground">
                        No {SUBSTRATE_LABEL[chosen].toLowerCase()} rate yet. This surface keeps the{" "}
                        {SUBSTRATE_LABEL[substrateOf(active)].toLowerCase()} speed.
                      </p>
                    ) : null}
                    <details className="rounded-lg border border-border p-3">
                      <summary className="cursor-pointer text-xs font-medium text-primary">Advanced surface options · paint, coverage & overrides</summary>
                      <div className="mt-3 grid gap-2 sm:grid-cols-2">
                      <div className="grid gap-1">
                        <Label htmlFor={`${surface.id}-product`}>Paint</Label>
                        <Input
                          id={`${surface.id}-product`}
                          data-testid={`surface-product-${rate.id}`}
                          value={surface.productName ?? ""}
                          placeholder={active.productName || "Paint product"}
                          className="h-10"
                          onValueChange={(productName) => updateSurface(surface, { productName })}
                        />
                      </div>
                      <OverrideField
                        id={`${surface.id}-coverage`}
                        label={unit === "items" ? "Gallons each" : unit === "ln ft" ? "Ln ft / gal" : "Sq ft / gal"}
                        ariaLabel={`${rate.internalLabel} coverage`}
                        testId={`surface-coverage-${rate.id}`}
                        value={surface.coveragePerCoat ?? null}
                        onChange={(coveragePerCoat) => updateSurface(surface, { coveragePerCoat })}
                      />
                    </div>
                    <div className={unit === "items" ? "grid max-w-xs gap-2" : "grid grid-cols-2 gap-2"}>
                      {unit === "items" ? null : (
                        <div className="grid gap-1">
                          <OverrideField
                            id={`${surface.id}-quantity`}
                            label={unit === "ln ft" ? "Ln ft" : "Sq ft"}
                            ariaLabel={`${rate.internalLabel} ${unit === "ln ft" ? "linear feet" : "square feet"}`}
                            testId={`surface-quantity-${rate.id}`}
                            value={surface.quantityOverride}
                            onChange={(quantityOverride) => updateSurface(surface, { quantityOverride })}
                          />
                          <p className="text-xs text-muted-foreground">
                            Room math is {roomQuantity} {unit}
                            {surface.quantityOverride !== null ? (
                              <>
                                {" "}
                                <button
                                  type="button"
                                  className="font-medium text-primary"
                                  data-testid={`use-room-${rate.id}`}
                                  onClick={() => updateSurface(surface, { quantityOverride: null })}
                                >
                                  Use room math
                                </button>
                              </>
                            ) : null}
                          </p>
                        </div>
                      )}
                      <div className="grid gap-1">
                        <OverrideField
                          id={`${surface.id}-hours`}
                          label="Hours"
                          ariaLabel={`${rate.internalLabel} hours`}
                          testId={`surface-hours-${rate.id}`}
                          value={surface.hoursOverride ?? null}
                          onChange={(hoursOverride) => updateSurface(surface, { hoursOverride })}
                        />
                        <p className="text-xs text-muted-foreground">
                          {surface.hoursOverride !== null && surface.hoursOverride !== undefined
                            ? "Used as typed. "
                            : "Leave blank to calculate. "}
                          {surface.hoursOverride !== null && surface.hoursOverride !== undefined ? (
                            <button
                              type="button"
                              className="font-medium text-primary"
                              data-testid={`use-calculated-hours-${rate.id}`}
                              onClick={() => updateSurface(surface, { hoursOverride: null })}
                            >
                              Use calculated hours
                            </button>
                          ) : null}
                        </p>
                      </div>
                    </div>
                    <label className="flex items-start gap-2 text-sm">
                      <input
                        type="checkbox"
                        className="mt-0.5"
                        data-testid={`hide-proposal-${rate.id}`}
                        checked={Boolean(surface.hideFromCustomer ?? active.hideFromCustomer)}
                        onChange={(event) =>
                          updateSurface(surface, { hideFromCustomer: event.target.checked })
                        }
                      />
                      <span>
                        Hide on the proposal
                        {surface.hideFromCustomer ?? active.hideFromCustomer ? (
                          <span className="mt-0.5 block text-xs text-muted-foreground">
                            Hours stay in the price. The work order still lists it.
                          </span>
                        ) : null}
                      </span>
                    </label>
                    </details>
                    </div>
                  ) : null}
                </div>
              )
            })}
          </div>
        ))}
      </div>
      </details>
      <details className="mt-3 rounded-xl border border-border p-3">
        <summary className="cursor-pointer text-sm font-medium text-primary">Custom production rate (optional)</summary>
        <div className="mt-3"><OneOffRateForm kind={kind} onAdd={onApplyOneOff} /></div>
      </details>
      </div>
    </details>
  )
}
function finishCoatChoices(rate: ProductionRate, selected: number): number[] {
const counts = new Set([1, 2, 3, 4, 5, 6])
  for (const entry of rate.coatRates) {
    if (entry.coats >= 1 && entry.coats <= 6) counts.add(entry.coats)
  }
  if (selected >= 1 && selected <= 6) counts.add(Math.round(selected))
  return [...counts].sort((left, right) => left - right)
}
function ratesForArea(rates: ProductionRate[], kind: EstimateKind, area: AreaInput): ProductionRate[] {
const allowed = ratesForKind(rates, kind)
const extras = rates.filter(
    (rate) => area.surfaces.some((surface) => surface.rateId === rate.id) && !allowed.some((item) => item.id === rate.id),
  )
  return [...allowed, ...extras]
}
function RoomOpenings({ area, onChange }: { area: AreaInput; onChange: (area: AreaInput) => void }) {
const openings = area.openings ?? []
const add = (kind: AreaOpening["kind"]) => {
const opening: AreaOpening = {
      id: crypto.randomUUID(),
      kind,
      widthFt: kind === "door" ? 3 : 3,
      heightFt: kind === "door" ? 7 : 4,
      count: 1,
      excludeFromWalls: true,
    }
    onChange({ ...area, openings: [...openings, opening] })
  }
const update = (id: string, patch: Partial<AreaOpening>) => {
    onChange({
      ...area,
      openings: openings.map((opening) => (opening.id === id ? { ...opening, ...patch } : opening)),
    })
  }
  return (
    <div className="mt-3 flex flex-col gap-2" data-testid="room-openings">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-xs font-semibold tracking-[0.14em] text-muted-foreground uppercase">Doors and windows</h3>
        <div className="flex gap-2">
          <button type="button" className="text-sm font-medium text-primary" data-testid="add-door-opening" onClick={() => add("door")}>
            Add door
          </button>
          <button type="button" className="text-sm font-medium text-primary" data-testid="add-window-opening" onClick={() => add("window")}>
            Add window
          </button>
        </div>
      </div>
      {openings.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          Add a door or window when it should come out of the paintable wall area. Frame painting stays on the door and window surfaces.
        </p>
      ) : null}
      {openings.map((opening) => (
        <div key={opening.id} className="grid gap-2 rounded-xl border border-border p-2 sm:grid-cols-[auto_1fr_1fr_5rem_auto]">
          <p className="self-end pb-2 text-sm font-medium capitalize">{opening.kind}</p>
          <NumberField
            id={`${opening.id}-width`}
            label="Width"
            value={opening.widthFt}
            onChange={(widthFt) => update(opening.id, { widthFt })}
          />
          <NumberField
            id={`${opening.id}-height`}
            label="Height"
            value={opening.heightFt}
            onChange={(heightFt) => update(opening.id, { heightFt })}
          />
          <NumberField
            id={`${opening.id}-count`}
            label="Count"
            value={opening.count}
            onChange={(count) => update(opening.id, { count })}
          />
          <div className="flex items-end gap-3 pb-2">
            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              <input
                type="checkbox"
                data-testid={`exclude-opening-${opening.kind}`}
                checked={opening.excludeFromWalls}
                onChange={(event) => update(opening.id, { excludeFromWalls: event.target.checked })}
              />
              Exclude
            </label>
            <button
              type="button"
              className="text-sm text-muted-foreground"
              onClick={() => onChange({ ...area, openings: openings.filter((item) => item.id !== opening.id) })}
            >
              Remove
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
function rateGroups(rates: ProductionRate[]): { category: string; rates: ProductionRate[] }[] {
const groups: { category: string; rates: ProductionRate[] }[] = []
  for (const rate of rates) {
const existing = groups.find((group) => group.category === rate.category)
    if (existing) existing.rates.push(rate)
    else groups.push({ category: rate.category, rates: [rate] })
  }
  return groups
}
function accessPreset(factor: number | undefined): "1" | "1.25" | "custom" {
  if (factor === 1.25) return "1.25"
  if (factor === undefined || factor === 1) return "1"
  return "custom"
}
function customAccess(factor: number | undefined): number {
  if (factor && factor !== 1 && factor !== 1.25) return factor
  return 1.5
}
function OverrideField({
id,
label,
ariaLabel,
testId,
value,
onChange,
}: {
  id: string
  label: string
  ariaLabel: string
  testId: string
  value: number | null
  onChange: (value: number | null) => void
}) {
const [text, setText] = useState<string | null>(null)
const shown = text ?? (value === null ? "" : String(value))
  return (
    <div className="grid gap-1">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        inputMode="decimal"
        aria-label={ariaLabel}
        data-testid={testId}
        value={shown}
        placeholder="Override"
        className="h-10"
        onFocus={() => setText(value === null ? "" : String(value))}
        onBlur={() => setText(null)}
        onValueChange={(next) => {
const cleaned = decimalText(next)
          setText(cleaned)
          if (cleaned === "" || cleaned === ".") {
            onChange(null)
            return
          }
const parsed = Number(cleaned)
          if (Number.isFinite(parsed)) onChange(parsed)
        }}
      />
    </div>
  )
}
function decimalText(value: string): string {
const cleaned = value.replace(/[^0-9.]/g, "")
const dot = cleaned.indexOf(".")
  if (dot === -1) return cleaned
  return `${cleaned.slice(0, dot + 1)}${cleaned.slice(dot + 1).replace(/\\./g, "")}`
}
function NumberField({
id,
label,
value,
onChange,
}: {
  id: string
  label: string
  value: number
  onChange: (value: number) => void
}) {
const typed = useTypedNumber(value, onChange)
  return (
    <div className="grid gap-1">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        inputMode="decimal"
        placeholder="0"
        value={typed.value === "0" && value === 0 ? "" : typed.value}
        className="h-11"
        onFocus={typed.onFocus}
        onBlur={typed.onBlur}
        onValueChange={typed.onValueChange}
      />
    </div>
  )
}
