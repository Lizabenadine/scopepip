"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState, useMemo, useEffect } from "react"
import {
  Plus,
  Trash2,
  Copy,
  ChevronDown,
  ChevronUp,
  Layers,
  Sparkles,
  ShoppingBag,
  Calculator,
  CheckCircle2,
  FileCheck2,
  Scissors,
  Check,
} from "lucide-react"
import { useScope } from "@/lib/data/store"
import { money, moneyExact } from "@/lib/format"
import { formatFeetInches } from "@/lib/estimate/dimensions"
import type {
  DrywallAssemblyTemplate,
  DrywallBoardSize,
  DrywallBoardType,
  DrywallFinishLevel,
  DrywallOpening,
  DrywallRoom,
  DrywallScope,
  DrywallTexture,
} from "@/lib/estimate/multi-trade-types"
import {
  DRYWALL_ASSEMBLY_TEMPLATES,
  DRYWALL_BOARD_LABELS,
  DRYWALL_BOARD_SIZE_SPECS,
  DRYWALL_FINISH_LEVEL_LABELS,
  createBlankDrywallRoom,
  createBlankDrywallScope,
} from "@/lib/drywall/defaults"
import { calculateDrywallQuote, recomputeDrywallRoomGeometry } from "@/lib/drywall/calculate"
import { cn } from "@/lib/utils"

export function DrywallEstimator({
  initialScope,
  estimateId,
  clientName,
  onSaveScope,
}: {
  initialScope?: DrywallScope
  estimateId?: string
  clientName?: string
  onSaveScope?: (scope: DrywallScope) => void
}) {
  const router = useRouter()
  const { clients, stages, estimates, productionRates, estimateSettings, saveEstimate } = useScope()

  const [scope, setScope] = useState<DrywallScope>(() => initialScope || createBlankDrywallScope())
  const [activeTab, setActiveTab] = useState<"takeoff" | "buylist" | "templates">("takeoff")
  const [expandedRoomId, setExpandedRoomId] = useState<string | null>(
    () => scope.rooms[0]?.id || null
  )
  const [selectedClientId, setSelectedClientId] = useState<string>("")
  const [projectTitle, setProjectTitle] = useState<string>("Drywall Project")
  const [jobAddress, setJobAddress] = useState<string>("")
  const [savedNotice, setSavedNotice] = useState<string | null>(null)

  const quote = useMemo(() => calculateDrywallQuote(scope), [scope])

  useEffect(() => {
    if (onSaveScope) onSaveScope(scope)
  }, [scope, onSaveScope])

  function updateRoom(roomId: string, patch: Partial<DrywallRoom>) {
    setScope((prev) => ({
      ...prev,
      rooms: prev.rooms.map((r) => {
        if (r.id !== roomId) return r
        const updated = { ...r, ...patch }
        return recomputeDrywallRoomGeometry(updated)
      }),
    }))
  }

  function addRoom() {
    const newRoom = createBlankDrywallRoom(`Room ${scope.rooms.length + 1}`)
    setScope((prev) => ({
      ...prev,
      rooms: [...prev.rooms, newRoom],
    }))
    setExpandedRoomId(newRoom.id)
  }

  function duplicateRoom(room: DrywallRoom) {
    const dup: DrywallRoom = {
      ...room,
      id: `dw-room-${Math.random().toString(36).slice(2, 9)}`,
      name: `${room.name} (Copy)`,
    }
    setScope((prev) => ({
      ...prev,
      rooms: [...prev.rooms, dup],
    }))
    setExpandedRoomId(dup.id)
  }

  function deleteRoom(roomId: string) {
    if (scope.rooms.length <= 1) return
    setScope((prev) => ({
      ...prev,
      rooms: prev.rooms.filter((r) => r.id !== roomId),
    }))
  }

  function applyAssemblyTemplate(roomId: string, template: DrywallAssemblyTemplate) {
    updateRoom(roomId, {
      boardType: template.boardType,
      boardSize: template.boardSize,
      wastePercent: template.wastePercent,
      finishLevel: template.finishLevel,
      texture: template.texture,
      boardCostPerSheet: template.boardCostPerSheet,
      hangCostPerSqFt: template.hangCostPerSqFt,
      finishCostPerSqFt: template.finishCostPerSqFt,
      insulationType: template.insulationType,
      insulationCostPerSqFt: template.insulationCostPerSqFt,
    })
  }

  function addOpening(roomId: string, type: DrywallOpening["type"] = "standard_door") {
    const room = scope.rooms.find((r) => r.id === roomId)
    if (!room) return

    const newOpening: DrywallOpening =
      type === "window"
        ? {
            id: `op-${Math.random().toString(36).slice(2, 7)}`,
            type: "window",
            name: "Window (3'x5')",
            width: { feet: 3, inches: 0 },
            height: { feet: 5, inches: 0 },
            sqFt: 15,
          }
        : {
            id: `op-${Math.random().toString(36).slice(2, 7)}`,
            type: "standard_door",
            name: "Standard Door (3'x6'8\")",
            width: { feet: 3, inches: 0 },
            height: { feet: 6, inches: 8 },
            sqFt: 20,
          }

    updateRoom(roomId, {
      openings: [...room.openings, newOpening],
    })
  }

  function removeOpening(roomId: string, opId: string) {
    const room = scope.rooms.find((r) => r.id === roomId)
    if (!room) return
    updateRoom(roomId, {
      openings: room.openings.filter((o) => o.id !== opId),
    })
  }

  function handleSaveProject() {
    const existing = estimateId ? estimates.find((e) => e.id === estimateId) : null
    if (existing) {
      const client = clients.find((c) => c.id === existing.clientId)
      saveEstimate({
        ...existing,
        clientName: client?.name || "",
        clientEmail: client?.email || "",
        title: projectTitle,
        jobAddress,
        trades: ["drywall"],
        primaryTrade: "drywall",
        drywallScope: scope,
      })
      setSavedNotice("Drywall estimate updated!")
      setTimeout(() => setSavedNotice(null), 3000)
    } else {
      const client = clients.find((c) => c.id === selectedClientId) || clients[0]
      const lead = stages.find((s) => s.slug === "lead") || stages[0]
      const created = saveEstimate({
        id: null,
        clientId: client?.id || null,
        clientName: client?.name || "",
        clientEmail: client?.email || "",
        stageId: lead?.id || "",
        title: projectTitle || "Drywall Installation & Finishing",
        jobAddress,
        trades: ["drywall"],
        primaryTrade: "drywall",
        drywallScope: scope,
        estimateKind: "interior",
        areas: [],
        lineItems: [],
        rates: productionRates,
        settings: estimateSettings,
        scheduledOn: null,
        notes: "",
        crewNote: "",
        acceptedAt: null,
        publicToken: "",
        clientStatus: "draft",
        signature: null,
        paymentStatus: "unpaid",
        depositReceipt: null,
        createdAt: null,
      })
      setSavedNotice("Drywall estimate created!")
      router.push(`/proposal/${created.id}`)
    }
  }

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto pb-16">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-900">
              <Layers className="size-3.5" /> Drywall Estimator
            </span>
            {clientName && (
              <span className="text-xs font-medium text-slate-500">Client: {clientName}</span>
            )}
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 mt-1">
            {projectTitle || "Drywall Takeoff, Hanging & Level 0–5 Finishing"}
          </h1>
          <p className="text-xs text-slate-500">
            Sheet counts, fasteners, joint compound, corner beads, insulation, and Level 0–5 finishing labor.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {savedNotice && (
            <span className="inline-flex items-center gap-1 rounded-xl bg-emerald-50 border border-emerald-200 px-3 py-1.5 text-xs font-semibold text-emerald-800 animate-in fade-in">
              <CheckCircle2 className="size-3.5" /> {savedNotice}
            </span>
          )}
          <button
            type="button"
            onClick={handleSaveProject}
            data-testid="save-drywall-estimate"
            className="inline-flex items-center gap-1.5 rounded-xl bg-amber-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-amber-700 transition-colors"
          >
            <FileCheck2 className="size-3.5" />
            <span>Save &amp; View Proposal</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab("takeoff")}
          data-testid="tab-drywall-takeoff"
          className={cn(
            "inline-flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-all",
            activeTab === "takeoff"
              ? "bg-slate-900 text-white shadow-xs"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          )}
        >
          <Calculator className="size-3.5" />
          <span>Room Takeoff ({scope.rooms.length})</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("buylist")}
          data-testid="tab-drywall-buylist"
          className={cn(
            "inline-flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-all",
            activeTab === "buylist"
              ? "bg-amber-600 text-white shadow-xs"
              : "bg-amber-50 text-amber-900 hover:bg-amber-100 border border-amber-200/60"
          )}
        >
          <ShoppingBag className="size-3.5" />
          <span>Material Buy-List ({quote.buyList.length})</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("templates")}
          data-testid="tab-drywall-templates"
          className={cn(
            "inline-flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-all",
            activeTab === "templates"
              ? "bg-purple-600 text-white shadow-xs"
              : "bg-purple-50 text-purple-800 hover:bg-purple-100 border border-purple-200/60"
          )}
        >
          <Sparkles className="size-3.5" />
          <span>Assemblies &amp; Templates</span>
        </button>
      </div>

      {/* Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (8 cols): Room Takeoff or Buy-List */}
        <div className="lg:col-span-8 flex flex-col gap-4">
          {activeTab === "takeoff" && (
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
                  Rooms &amp; Drywall Surfaces
                </h2>
                <button
                  type="button"
                  onClick={addRoom}
                  data-testid="add-drywall-room"
                  className="inline-flex items-center gap-1 rounded-xl bg-slate-100 hover:bg-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors"
                >
                  <Plus className="size-3.5" /> Add Room
                </button>
              </div>

              {scope.rooms.map((room, index) => {
                const isExpanded = expandedRoomId === room.id
                return (
                  <div
                    key={room.id}
                    data-testid={`drywall-room-card-${room.id}`}
                    className="rounded-2xl border border-slate-200 bg-white shadow-xs transition-all overflow-hidden"
                  >
                    {/* Room Card Header */}
                    <div
                      onClick={() => setExpandedRoomId(isExpanded ? null : room.id)}
                      className="flex items-center justify-between p-4 cursor-pointer hover:bg-slate-50/70 border-b border-slate-100"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="flex size-7 items-center justify-center rounded-lg bg-amber-50 text-amber-800 text-xs font-bold">
                          {index + 1}
                        </span>
                        <div>
                          <p className="font-bold text-slate-900 text-sm">{room.name}</p>
                          <p className="text-xs text-slate-500">
                            {formatFeetInches(room.length)} × {formatFeetInches(room.width)} ×{" "}
                            {formatFeetInches(room.height)} ·{" "}
                            <span className="font-semibold text-slate-800">{room.totalNetSqFt} sq ft board</span> ·{" "}
                            <span className="text-amber-800 font-medium">
                              {DRYWALL_BOARD_LABELS[room.boardType]} (Level {room.finishLevel})
                            </span>
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => duplicateRoom(room)}
                          title="Duplicate room"
                          className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
                        >
                          <Copy className="size-3.5" />
                        </button>
                        {scope.rooms.length > 1 && (
                          <button
                            type="button"
                            onClick={() => deleteRoom(room.id)}
                            title="Delete room"
                            className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50"
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setExpandedRoomId(isExpanded ? null : room.id)}
                          className="p-1.5 text-slate-500 hover:text-slate-800"
                        >
                          {isExpanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
                        </button>
                      </div>
                    </div>

                    {/* Room Card Body */}
                    {isExpanded && (
                      <div className="p-4 flex flex-col gap-5 bg-slate-50/30">
                        {/* Name and 3D Dimensions */}
                        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                          <div>
                            <label className="text-xs font-semibold text-slate-700 block mb-1">Room Name</label>
                            <input
                              type="text"
                              value={room.name}
                              onChange={(e) => updateRoom(room.id, { name: e.target.value })}
                              className="h-9 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium focus:border-blue-500 focus:outline-none"
                            />
                          </div>

                          <div>
                            <label className="text-xs font-semibold text-slate-700 block mb-1">Length (Ft &amp; In)</label>
                            <div className="flex items-center gap-1.5">
                              <input
                                type="number"
                                min={0}
                                value={room.length.feet}
                                onChange={(e) =>
                                  updateRoom(room.id, {
                                    length: { ...room.length, feet: parseInt(e.target.value || "0", 10) },
                                  })
                                }
                                className="h-9 w-full rounded-xl border border-slate-200 bg-white px-2 text-xs text-center font-bold"
                              />
                              <span className="text-xs text-slate-400">ft</span>
                              <input
                                type="number"
                                min={0}
                                max={11}
                                value={room.length.inches}
                                onChange={(e) =>
                                  updateRoom(room.id, {
                                    length: { ...room.length, inches: parseInt(e.target.value || "0", 10) },
                                  })
                                }
                                className="h-9 w-full rounded-xl border border-slate-200 bg-white px-2 text-xs text-center font-bold"
                              />
                              <span className="text-xs text-slate-400">in</span>
                            </div>
                          </div>

                          <div>
                            <label className="text-xs font-semibold text-slate-700 block mb-1">Width (Ft &amp; In)</label>
                            <div className="flex items-center gap-1.5">
                              <input
                                type="number"
                                min={0}
                                value={room.width.feet}
                                onChange={(e) =>
                                  updateRoom(room.id, {
                                    width: { ...room.width, feet: parseInt(e.target.value || "0", 10) },
                                  })
                                }
                                className="h-9 w-full rounded-xl border border-slate-200 bg-white px-2 text-xs text-center font-bold"
                              />
                              <span className="text-xs text-slate-400">ft</span>
                              <input
                                type="number"
                                min={0}
                                max={11}
                                value={room.width.inches}
                                onChange={(e) =>
                                  updateRoom(room.id, {
                                    width: { ...room.width, inches: parseInt(e.target.value || "0", 10) },
                                  })
                                }
                                className="h-9 w-full rounded-xl border border-slate-200 bg-white px-2 text-xs text-center font-bold"
                              />
                              <span className="text-xs text-slate-400">in</span>
                            </div>
                          </div>

                          <div>
                            <label className="text-xs font-semibold text-slate-700 block mb-1">Height (Ft &amp; In)</label>
                            <div className="flex items-center gap-1.5">
                              <input
                                type="number"
                                min={0}
                                value={room.height.feet}
                                onChange={(e) =>
                                  updateRoom(room.id, {
                                    height: { ...room.height, feet: parseInt(e.target.value || "0", 10) },
                                  })
                                }
                                className="h-9 w-full rounded-xl border border-slate-200 bg-white px-2 text-xs text-center font-bold"
                              />
                              <span className="text-xs text-slate-400">ft</span>
                              <input
                                type="number"
                                min={0}
                                max={11}
                                value={room.height.inches}
                                onChange={(e) =>
                                  updateRoom(room.id, {
                                    height: { ...room.height, inches: parseInt(e.target.value || "0", 10) },
                                  })
                                }
                                className="h-9 w-full rounded-xl border border-slate-200 bg-white px-2 text-xs text-center font-bold"
                              />
                              <span className="text-xs text-slate-400">in</span>
                            </div>
                          </div>
                        </div>

                        {/* Surfaces to Hang */}
                        <div className="flex items-center gap-6 bg-white border border-slate-200 rounded-xl p-3">
                          <span className="text-xs font-bold text-slate-800">Include Surfaces:</span>
                          <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={room.includeWalls}
                              onChange={(e) => updateRoom(room.id, { includeWalls: e.target.checked })}
                              className="rounded text-amber-600 size-4"
                            />
                            <span>Walls ({room.netWallSqFt} sq ft)</span>
                          </label>

                          <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={room.includeCeiling}
                              onChange={(e) => updateRoom(room.id, { includeCeiling: e.target.checked })}
                              className="rounded text-amber-600 size-4"
                            />
                            <span>Ceiling ({room.netCeilingSqFt} sq ft)</span>
                          </label>
                        </div>

                        {/* Openings & Deductions (Doors, Windows) */}
                        <div className="border border-slate-200 bg-white rounded-xl p-3">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-bold text-slate-800 flex items-center gap-1">
                              <Scissors className="size-3 text-slate-500" /> Openings &amp; Deductions (Doors, Windows)
                            </span>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => addOpening(room.id, "standard_door")}
                                className="text-xs font-semibold text-amber-700 hover:text-amber-800"
                              >
                                + Add Door (20 sf)
                              </button>
                              <button
                                type="button"
                                onClick={() => addOpening(room.id, "window")}
                                className="text-xs font-semibold text-amber-700 hover:text-amber-800"
                              >
                                + Add Window (15 sf)
                              </button>
                            </div>
                          </div>
                          {room.openings.length === 0 ? (
                            <p className="text-xs text-slate-400 italic">No openings deducted.</p>
                          ) : (
                            <div className="flex flex-col gap-2">
                              {room.openings.map((op) => (
                                <div key={op.id} className="flex items-center gap-2 bg-slate-50 p-2 rounded-lg text-xs">
                                  <input
                                    type="text"
                                    value={op.name}
                                    onChange={(e) => {
                                      const updatedOps = room.openings.map((o) =>
                                        o.id === op.id ? { ...o, name: e.target.value } : o
                                      )
                                      updateRoom(room.id, { openings: updatedOps })
                                    }}
                                    className="h-7 rounded border border-slate-200 bg-white px-2 text-xs flex-1"
                                  />
                                  <span className="text-slate-400">Width:</span>
                                  <input
                                    type="number"
                                    value={op.width.feet}
                                    onChange={(e) => {
                                      const feet = parseInt(e.target.value || "0", 10)
                                      const updatedOps = room.openings.map((o) =>
                                        o.id === op.id ? { ...o, width: { ...o.width, feet } } : o
                                      )
                                      updateRoom(room.id, { openings: updatedOps })
                                    }}
                                    className="h-7 w-12 rounded border border-slate-200 bg-white text-center text-xs"
                                  />
                                  <span className="text-slate-400">ft × Height:</span>
                                  <input
                                    type="number"
                                    value={op.height.feet}
                                    onChange={(e) => {
                                      const feet = parseInt(e.target.value || "0", 10)
                                      const updatedOps = room.openings.map((o) =>
                                        o.id === op.id ? { ...o, height: { ...o.height, feet } } : o
                                      )
                                      updateRoom(room.id, { openings: updatedOps })
                                    }}
                                    className="h-7 w-12 rounded border border-slate-200 bg-white text-center text-xs"
                                  />
                                  <span className="text-slate-400">ft</span>
                                  <button
                                    type="button"
                                    onClick={() => removeOpening(room.id, op.id)}
                                    className="p-1 text-slate-400 hover:text-rose-600"
                                  >
                                    <Trash2 className="size-3" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Board Type & Size */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div>
                            <label className="text-xs font-semibold text-slate-700 block mb-1">Drywall Board Type</label>
                            <select
                              value={room.boardType}
                              onChange={(e) => updateRoom(room.id, { boardType: e.target.value as DrywallBoardType })}
                              className="h-9 w-full rounded-xl border border-slate-200 bg-white px-2.5 text-xs font-medium"
                            >
                              {Object.entries(DRYWALL_BOARD_LABELS).map(([k, v]) => (
                                <option key={k} value={k}>
                                  {v}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="text-xs font-semibold text-slate-700 block mb-1">Sheet Size</label>
                            <select
                              value={room.boardSize}
                              onChange={(e) => updateRoom(room.id, { boardSize: e.target.value as DrywallBoardSize })}
                              className="h-9 w-full rounded-xl border border-slate-200 bg-white px-2.5 text-xs font-medium"
                            >
                              {Object.entries(DRYWALL_BOARD_SIZE_SPECS).map(([k, v]) => (
                                <option key={k} value={k}>
                                  {v.label}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="text-xs font-semibold text-slate-700 block mb-1">Waste Factor %</label>
                            <input
                              type="number"
                              min={0}
                              max={30}
                              value={room.wastePercent}
                              onChange={(e) =>
                                updateRoom(room.id, { wastePercent: parseInt(e.target.value || "10", 10) })
                              }
                              className="h-9 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold"
                            />
                          </div>
                        </div>

                        {/* Finish Level 0–5 & Texture */}
                        <div className="border border-slate-200 bg-white rounded-xl p-3 flex flex-col gap-3">
                          <div>
                            <label className="text-xs font-bold text-slate-800 block mb-1">
                              Finishing Specification (Levels 0–5)
                            </label>
                            <div className="grid grid-cols-2 sm:grid-cols-6 gap-1.5">
                              {([0, 1, 2, 3, 4, 5] as DrywallFinishLevel[]).map((lvl) => {
                                const isSel = room.finishLevel === lvl
                                return (
                                  <button
                                    key={lvl}
                                    type="button"
                                    onClick={() => updateRoom(room.id, { finishLevel: lvl })}
                                    className={cn(
                                      "flex flex-col items-center justify-center p-2 rounded-xl border text-center transition-all",
                                      isSel
                                        ? "border-amber-500 bg-amber-50 text-amber-900 font-bold shadow-xs"
                                        : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                                    )}
                                  >
                                    <span className="text-xs font-bold">Level {lvl}</span>
                                    <span className="text-[10px] text-slate-500 mt-0.5 truncate w-full">
                                      {lvl === 0 ? "No Tape" : lvl === 1 ? "Fire Tape" : lvl === 4 ? "Standard" : lvl === 5 ? "Skim Coat" : `Level ${lvl}`}
                                    </span>
                                  </button>
                                )
                              })}
                            </div>
                            <p className="text-xs text-slate-500 mt-2">
                              {DRYWALL_FINISH_LEVEL_LABELS[room.finishLevel]?.description}
                            </p>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-100">
                            <div>
                              <label className="text-xs font-semibold text-slate-700 block mb-1">Texture</label>
                              <select
                                value={room.texture}
                                onChange={(e) => updateRoom(room.id, { texture: e.target.value as DrywallTexture })}
                                className="h-8.5 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-xs"
                              >
                                <option value="smooth">Smooth (Standard / Skim)</option>
                                <option value="orange_peel">Orange Peel Texture</option>
                                <option value="knockdown">Knockdown Texture</option>
                                <option value="popcorn_removal">Popcorn Ceiling Removal &amp; Re-Skim</option>
                                <option value="none">None / Raw Board</option>
                              </select>
                            </div>

                            <div>
                              <label className="text-xs font-semibold text-slate-700 block mb-1">
                                Outside Corner Bead (Linear Ft)
                              </label>
                              <input
                                type="number"
                                min={0}
                                value={room.outsideCornerBeadFt}
                                onChange={(e) =>
                                  updateRoom(room.id, {
                                    outsideCornerBeadFt: parseFloat(e.target.value || "0"),
                                  })
                                }
                                className="h-8.5 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-bold"
                              />
                            </div>
                          </div>
                        </div>

                        {/* Labor Rates */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="text-xs font-semibold text-slate-700 block mb-1">
                              Hanging Labor ($/sq ft)
                            </label>
                            <input
                              type="number"
                              step="0.05"
                              value={room.hangCostPerSqFt}
                              onChange={(e) =>
                                updateRoom(room.id, { hangCostPerSqFt: parseFloat(e.target.value || "0") })
                              }
                              className="h-9 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold"
                            />
                          </div>

                          <div>
                            <label className="text-xs font-semibold text-slate-700 block mb-1">
                              Finishing Labor Override ($/sq ft)
                            </label>
                            <input
                              type="number"
                              step="0.05"
                              placeholder={`Default (${DRYWALL_FINISH_LEVEL_LABELS[room.finishLevel]?.costPerSqFt})`}
                              value={room.finishCostPerSqFt || ""}
                              onChange={(e) =>
                                updateRoom(room.id, {
                                  finishCostPerSqFt: e.target.value ? parseFloat(e.target.value) : 0,
                                })
                              }
                              className="h-9 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {activeTab === "buylist" && (
            <div className="flex flex-col gap-4 bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <div>
                  <h2 className="text-base font-bold text-slate-900">Automatic Material Buy-List</h2>
                  <p className="text-xs text-slate-500">
                    Exact purchasing units calculated for sheets, pails of compound, rolls of tape, and screw boxes.
                  </p>
                </div>
                <span className="text-xs font-bold bg-amber-100 text-amber-900 px-3 py-1 rounded-full">
                  {quote.buyList.length} line items
                </span>
              </div>

              {quote.buyList.length === 0 ? (
                <p className="text-sm text-slate-500 italic p-6 text-center">No materials calculated yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-500">
                        <th className="py-2.5 font-semibold">Category</th>
                        <th className="py-2.5 font-semibold">Item &amp; Spec</th>
                        <th className="py-2.5 font-semibold text-right">Estimated</th>
                        <th className="py-2.5 font-semibold text-right">Order Quantity</th>
                        <th className="py-2.5 font-semibold text-right">Unit Cost</th>
                        <th className="py-2.5 font-semibold text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {quote.buyList.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-50">
                          <td className="py-2 font-medium capitalize text-slate-600">{item.category}</td>
                          <td className="py-2 font-bold text-slate-900">{item.label}</td>
                          <td className="py-2 text-right text-slate-500">{item.estimatedQuantity}</td>
                          <td className="py-2 text-right font-bold text-amber-800">
                            {item.purchasingQuantity} {item.unit}
                          </td>
                          <td className="py-2 text-right text-slate-600">{moneyExact(item.unitCost)}</td>
                          <td className="py-2 text-right font-bold text-slate-900">{moneyExact(item.totalCost)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {activeTab === "templates" && (
            <div className="flex flex-col gap-4">
              <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
                Pre-Built Drywall Assemblies
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {DRYWALL_ASSEMBLY_TEMPLATES.map((tmpl) => (
                  <div
                    key={tmpl.id}
                    className="border border-slate-200 bg-white rounded-2xl p-4 shadow-xs flex flex-col justify-between gap-3"
                  >
                    <div>
                      <h3 className="font-bold text-slate-900 text-sm">{tmpl.name}</h3>
                      <p className="text-xs text-slate-500 mt-1">{tmpl.description}</p>
                      <div className="mt-3 flex flex-wrap gap-1 text-[11px] font-medium text-slate-600">
                        <span className="bg-slate-100 px-2 py-0.5 rounded">
                          Level {tmpl.finishLevel} Finish
                        </span>
                        <span className="bg-slate-100 px-2 py-0.5 rounded">
                          {tmpl.boardSize} Sheet
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        if (expandedRoomId) applyAssemblyTemplate(expandedRoomId, tmpl)
                        setActiveTab("takeoff")
                      }}
                      className="w-full rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 py-1.5 text-xs font-bold transition-colors"
                    >
                      Apply to Active Room
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Column (4 cols): Live Pricing Summary */}
        <div className="lg:col-span-4 flex flex-col gap-4">
          <div className="border border-slate-200 bg-white rounded-2xl p-5 shadow-xs sticky top-20 flex flex-col gap-4">
            <h2 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2 flex items-center justify-between">
              <span>Pricing &amp; Project Summary</span>
              <span className="text-xs font-semibold text-amber-900 bg-amber-50 px-2 py-0.5 rounded-full">
                {quote.totalNetSqFt.toLocaleString()} sq ft
              </span>
            </h2>

            {/* Metrics Breakdown */}
            <div className="flex flex-col gap-2 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-500">Net Wall Area:</span>
                <span className="font-bold text-slate-900">{quote.wallSqFt.toLocaleString()} sq ft</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-500">Net Ceiling Area:</span>
                <span className="font-bold text-slate-900">{quote.ceilingSqFt.toLocaleString()} sq ft</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-500">Drywall Sheets (Total):</span>
                <span className="font-bold text-amber-800">{quote.totalSheets} sheets</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-500">Board Materials:</span>
                <span className="font-bold text-slate-900">{moneyExact(quote.boardMaterialCost)}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-500">Joint Compound (Mud):</span>
                <span className="font-bold text-slate-900">{moneyExact(quote.jointCompoundCost)}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-500">Fasteners &amp; Tape:</span>
                <span className="font-bold text-slate-900">{moneyExact(quote.fastenersAndTapeCost)}</span>
              </div>
              {quote.cornerBeadCost > 0 && (
                <div className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-500">Corner Bead:</span>
                  <span className="font-bold text-slate-900">{moneyExact(quote.cornerBeadCost)}</span>
                </div>
              )}
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-500">Hanging Labor:</span>
                <span className="font-bold text-slate-900">{moneyExact(quote.hangingLaborCost)}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-500">Finishing Labor:</span>
                <span className="font-bold text-slate-900">{moneyExact(quote.finishingLaborCost)}</span>
              </div>
              {quote.dumpsterFee > 0 && (
                <div className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-500">Dumpster &amp; Disposal:</span>
                  <span className="font-bold text-slate-900">{moneyExact(quote.dumpsterFee)}</span>
                </div>
              )}
            </div>

            {/* Overhead & Profit Settings */}
            <div className="border-t border-slate-200 pt-3 flex flex-col gap-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-600 font-medium">Overhead ({scope.overheadPercent}%):</span>
                <span className="font-bold text-slate-900">{moneyExact(quote.overhead)}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-600 font-medium">Profit Margin ({scope.profitPercent}%):</span>
                <span className="font-bold text-slate-900">{moneyExact(quote.profit)}</span>
              </div>
            </div>

            {/* Total Highlight */}
            <div className="rounded-xl bg-slate-900 text-white p-4 flex items-baseline justify-between shadow-xs">
              <div>
                <p className="text-xs uppercase tracking-wider text-slate-400 font-semibold">Total Price</p>
                <p className="text-2xl font-black font-display tracking-tight text-white">{money(quote.total)}</p>
              </div>
              <span className="text-xs font-semibold text-slate-300">
                {quote.totalNetSqFt > 0 ? `${moneyExact(quote.total / quote.totalNetSqFt)}/sf` : ""}
              </span>
            </div>

            {/* Actions */}
            <button
              type="button"
              onClick={handleSaveProject}
              data-testid="drywall-save-action"
              className="w-full py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-xs transition-colors text-center"
            >
              Save Drywall Estimate
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
