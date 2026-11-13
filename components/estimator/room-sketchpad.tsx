"use client"

import { useEffect, useRef, useState, type PointerEvent } from "react"
import {
  Camera,
  Check,
  Download,
  Eraser,
  Eye,
  EyeOff,
  Maximize2,
  Paintbrush,
  Pencil,
  Redo2,
  RotateCcw,
  Tag,
  Trash2,
  Type,
  Undo2,
  Upload,
  X,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { AreaInput, RoomSketch } from "@/lib/types"

interface RoomSketchpadProps {
  room: AreaInput
  initialSketch?: RoomSketch | null
  onSave: (sketch: RoomSketch) => void
  onClose: () => void
}

const COLORS = [
  { name: "Cyan", hex: "#06b6d4" },
  { name: "Yellow", hex: "#eab308" },
  { name: "Red", hex: "#ef4444" },
  { name: "White", hex: "#ffffff" },
  { name: "Black", hex: "#18181b" },
] as const

const STROKE_WIDTHS = [
  { label: "Fine", value: 3 },
  { label: "Medium", value: 6 },
  { label: "Thick", value: 12 },
] as const

export function RoomSketchpad({ room, initialSketch, onSave, onClose }: RoomSketchpadProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [tool, setTool] = useState<"pen" | "eraser">("pen")
  const [color, setColor] = useState<string>("#06b6d4")
  const [lineWidth, setLineWidth] = useState<number>(4)
  const [isDrawing, setIsDrawing] = useState(false)
  const [history, setHistory] = useState<ImageData[]>([])
  const [historyIndex, setHistoryIndex] = useState(-1)
  const [backgroundImage, setBackgroundImage] = useState<string | undefined>(initialSketch?.backgroundImage)
  const [title, setTitle] = useState(initialSketch?.title || `${room.name || "Room"} Sketch`)
  const [notes, setNotes] = useState(initialSketch?.notes || "")
  const [includeInProposal, setIncludeInProposal] = useState(initialSketch?.includeInProposal ?? false)
  const [visibleToCrew, setVisibleToCrew] = useState(initialSketch?.visibleToCrew ?? true)
  const [confirmClear, setConfirmClear] = useState(false)
  const [customText, setCustomText] = useState("")

  const dimensionsText = `${room.lengthFt}' × ${room.widthFt}' (${room.heightFt}ft ceiling)`

  // Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Set fixed internal resolution for consistent drawing
    canvas.width = 720
    canvas.height = 540

    if (initialSketch?.imageData) {
      const img = new Image()
      img.onload = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height)
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
        saveState()
      }
      img.src = initialSketch.imageData
    } else {
      // Clean slate with subtle dark grid
      ctx.fillStyle = "#1e293b" // slate-800 canvas background
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      drawGrid(ctx, canvas.width, canvas.height)
      saveState()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function drawGrid(ctx: CanvasRenderingContext2D, width: number, height: number) {
    ctx.strokeStyle = "rgba(255, 255, 255, 0.05)"
    ctx.lineWidth = 1
    const gridSize = 36
    for (let x = 0; x < width; x += gridSize) {
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, height)
      ctx.stroke()
    }
    for (let y = 0; y < height; y += gridSize) {
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(width, y)
      ctx.stroke()
    }
  }

  function saveState() {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    setHistory((prev) => {
      const next = prev.slice(0, historyIndex + 1)
      return [...next, imageData]
    })
    setHistoryIndex((prev) => prev + 1)
  }

  function handleUndo() {
    if (historyIndex <= 0) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    const prevIndex = historyIndex - 1
    const snapshot = history[prevIndex]
    if (snapshot) {
      ctx.putImageData(snapshot, 0, 0)
      setHistoryIndex(prevIndex)
    }
  }

  function handleRedo() {
    if (historyIndex >= history.length - 1) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    const nextIndex = historyIndex + 1
    const snapshot = history[nextIndex]
    if (snapshot) {
      ctx.putImageData(snapshot, 0, 0)
      setHistoryIndex(nextIndex)
    }
  }

  function handleClear() {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    ctx.fillStyle = "#1e293b"
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    drawGrid(ctx, canvas.width, canvas.height)
    saveState()
    setConfirmClear(false)
  }

  function getCanvasCoords(event: PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    return {
      x: (event.clientX - rect.left) * scaleX,
      y: (event.clientY - rect.top) * scaleY,
    }
  }

  function handlePointerDown(event: PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current
    if (!canvas) return
    canvas.setPointerCapture(event.pointerId)
    setIsDrawing(true)

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const { x, y } = getCanvasCoords(event)
    ctx.beginPath()
    ctx.moveTo(x, y)
    ctx.lineCap = "round"
    ctx.lineJoin = "round"

    if (tool === "eraser") {
      ctx.strokeStyle = "#1e293b"
      ctx.lineWidth = lineWidth * 3
    } else {
      ctx.strokeStyle = color
      ctx.lineWidth = lineWidth
    }
  }

  function handlePointerMove(event: PointerEvent<HTMLCanvasElement>) {
    if (!isDrawing) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const { x, y } = getCanvasCoords(event)
    ctx.lineTo(x, y)
    ctx.stroke()
  }

  function handlePointerUp(event: PointerEvent<HTMLCanvasElement>) {
    if (!isDrawing) return
    setIsDrawing(false)
    const canvas = canvasRef.current
    if (!canvas) return
    try {
      canvas.releasePointerCapture(event.pointerId)
    } catch {
      // ignore
    }
    saveState()
  }

  function stampBadgeText(textToStamp: string) {
    const canvas = canvasRef.current
    if (!canvas || !textToStamp.trim()) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const x = canvas.width / 2
    const y = canvas.height / 2

    ctx.save()
    ctx.font = "bold 20px system-ui, -apple-system, sans-serif"
    ctx.textAlign = "center"
    ctx.textBaseline = "middle"

    const metrics = ctx.measureText(textToStamp)
    const paddingX = 16
    const paddingY = 10
    const boxW = metrics.width + paddingX * 2
    const boxH = 38
    const boxX = x - boxW / 2
    const boxY = y - boxH / 2

    // Background badge pill
    ctx.fillStyle = "rgba(15, 23, 42, 0.88)"
    ctx.strokeStyle = color || "#06b6d4"
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.roundRect(boxX, boxY, boxW, boxH, 10)
    ctx.fill()
    ctx.stroke()

    // Badge text
    ctx.fillStyle = "#ffffff"
    ctx.fillText(textToStamp, x, y)
    ctx.restore()

    saveState()
    setCustomText("")
  }

  function handlePhotoUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    event.target.value = ""

    const reader = new FileReader()
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string
      if (!dataUrl) return
      setBackgroundImage(dataUrl)

      const img = new Image()
      img.onload = () => {
        const canvas = canvasRef.current
        if (!canvas) return
        const ctx = canvas.getContext("2d")
        if (!ctx) return

        // Fill background
        ctx.fillStyle = "#0f172a"
        ctx.fillRect(0, 0, canvas.width, canvas.height)

        // Draw image aspect fitted
        const hRatio = canvas.width / img.width
        const vRatio = canvas.height / img.height
        const ratio = Math.min(hRatio, vRatio)
        const centerShiftX = (canvas.width - img.width * ratio) / 2
        const centerShiftY = (canvas.height - img.height * ratio) / 2

        ctx.drawImage(img, 0, 0, img.width, img.height, centerShiftX, centerShiftY, img.width * ratio, img.height * ratio)
        saveState()
      }
      img.src = dataUrl
    }
    reader.readAsDataURL(file)
  }

  function handleSave() {
    const canvas = canvasRef.current
    if (!canvas) return
    const imageData = canvas.toDataURL("image/jpeg", 0.78)
    const now = new Date().toISOString()

    const sketch: RoomSketch = {
      id: initialSketch?.id || `sketch_${crypto.randomUUID()}`,
      title: title.trim() || `${room.name} Sketch`,
      createdAt: initialSketch?.createdAt || now,
      updatedAt: now,
      imageData,
      backgroundImage,
      notes: notes.trim() || undefined,
      roomDimensionsText: dimensionsText,
      includeInProposal,
      visibleToCrew,
    }

    onSave(sketch)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-2 sm:p-4 backdrop-blur-sm">
      <div className="relative flex flex-col w-full max-w-4xl max-h-[96dvh] overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 text-white shadow-2xl">
        {/* Top Header */}
        <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3 bg-slate-950">
          <div className="flex items-center gap-2">
            <Pencil className="size-5 text-cyan-400" />
            <div>
              <h3 className="text-sm font-bold leading-tight">{title || `${room.name} Sketch`}</h3>
              <p className="text-[11px] text-slate-400">{dimensionsText}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleSave}
              className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 border-cyan-400 font-bold text-xs h-8 px-3"
            >
              <Check className="size-3.5 mr-1" />
              Save Sketch
            </Button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white"
            >
              <X className="size-5" />
            </button>
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 bg-slate-900/90 px-3 py-2 text-xs">
          {/* Drawing Tools */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setTool("pen")}
              className={`flex items-center gap-1 rounded-lg px-2.5 py-1.5 font-medium transition-colors ${
                tool === "pen" ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40" : "text-slate-300 hover:bg-slate-800"
              }`}
            >
              <Pencil className="size-3.5" />
              <span>Pen</span>
            </button>
            <button
              type="button"
              onClick={() => setTool("eraser")}
              className={`flex items-center gap-1 rounded-lg px-2.5 py-1.5 font-medium transition-colors ${
                tool === "eraser" ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40" : "text-slate-300 hover:bg-slate-800"
              }`}
            >
              <Eraser className="size-3.5" />
              <span>Eraser</span>
            </button>

            {/* Colors */}
            <div className="flex items-center gap-1 ml-2 border-l border-slate-700 pl-2">
              {COLORS.map((c) => (
                <button
                  key={c.hex}
                  type="button"
                  title={c.name}
                  onClick={() => {
                    setColor(c.hex)
                    setTool("pen")
                  }}
                  className={`size-6 rounded-full border-2 transition-transform ${
                    color === c.hex && tool === "pen" ? "scale-110 border-white shadow-sm" : "border-transparent"
                  }`}
                  style={{ backgroundColor: c.hex }}
                />
              ))}
            </div>

            {/* Stroke Width */}
            <div className="flex items-center gap-1 ml-2 border-l border-slate-700 pl-2">
              {STROKE_WIDTHS.map((sw) => (
                <button
                  key={sw.label}
                  type="button"
                  onClick={() => setLineWidth(sw.value)}
                  className={`rounded px-1.5 py-0.5 text-[11px] font-semibold ${
                    lineWidth === sw.value ? "bg-slate-700 text-cyan-300" : "text-slate-400 hover:text-white"
                  }`}
                >
                  {sw.label}
                </button>
              ))}
            </div>
          </div>

          {/* Actions: Undo, Redo, Camera, Clear */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handleUndo}
              disabled={historyIndex <= 0}
              className="rounded-lg p-1.5 text-slate-300 hover:bg-slate-800 disabled:opacity-40"
              title="Undo"
            >
              <Undo2 className="size-4" />
            </button>
            <button
              type="button"
              onClick={handleRedo}
              disabled={historyIndex >= history.length - 1}
              className="rounded-lg p-1.5 text-slate-300 hover:bg-slate-800 disabled:opacity-40"
              title="Redo"
            >
              <Redo2 className="size-4" />
            </button>

            {/* Upload / Camera Button */}
            <label className="flex cursor-pointer items-center gap-1 rounded-lg bg-slate-800 px-2 py-1 text-slate-300 hover:bg-slate-700 hover:text-white ml-1">
              <Camera className="size-3.5 text-cyan-400" />
              <span>Photo Markup</span>
              <input type="file" accept="image/*" capture="environment" className="sr-only" onChange={handlePhotoUpload} />
            </label>

            {/* Clear */}
            {confirmClear ? (
              <div className="flex items-center gap-1 ml-1 bg-rose-950/80 p-1 rounded-lg border border-rose-700">
                <span className="text-[10px] text-rose-200">Clear all?</span>
                <button type="button" onClick={handleClear} className="text-[10px] bg-rose-600 px-1.5 py-0.5 rounded font-bold">
                  Yes
                </button>
                <button type="button" onClick={() => setConfirmClear(false)} className="text-[10px] text-slate-400 px-1">
                  No
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmClear(true)}
                className="rounded-lg p-1.5 text-rose-400 hover:bg-slate-800 ml-1"
                title="Clear canvas"
              >
                <Trash2 className="size-4" />
              </button>
            )}
          </div>
        </div>

        {/* Quick Stamp Badges */}
        <div className="flex flex-wrap items-center gap-1.5 border-b border-slate-800/80 bg-slate-950 px-3 py-1.5 text-[11px]">
          <span className="text-slate-400 mr-1 flex items-center gap-1">
            <Tag className="size-3 text-cyan-400" /> Stamp:
          </span>
          <button
            type="button"
            onClick={() => stampBadgeText(dimensionsText)}
            className="rounded bg-slate-800 hover:bg-cyan-950 hover:text-cyan-300 border border-slate-700 px-2 py-0.5"
          >
            📐 {dimensionsText}
          </button>
          <button
            type="button"
            onClick={() => stampBadgeText("⚠️ Drywall Repair / Patch")}
            className="rounded bg-slate-800 hover:bg-amber-950 hover:text-amber-300 border border-slate-700 px-2 py-0.5"
          >
            ⚠️ Patch/Repair
          </button>
          <button
            type="button"
            onClick={() => stampBadgeText("🚪 Door & Casing")}
            className="rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 px-2 py-0.5"
          >
            🚪 Door
          </button>
          <button
            type="button"
            onClick={() => stampBadgeText("🪟 Window Trim")}
            className="rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 px-2 py-0.5"
          >
            🪟 Window
          </button>
          <button
            type="button"
            onClick={() => stampBadgeText("🎨 Accent Wall")}
            className="rounded bg-slate-800 hover:bg-cyan-950 hover:text-cyan-300 border border-slate-700 px-2 py-0.5"
          >
            🎨 Accent Wall
          </button>

          {/* Custom text stamp */}
          <div className="flex items-center gap-1 ml-auto">
            <input
              type="text"
              placeholder="Custom note stamp..."
              value={customText}
              onChange={(e) => setCustomText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && customText.trim()) stampBadgeText(customText.trim())
              }}
              className="h-6 w-36 rounded bg-slate-900 border border-slate-700 px-1.5 text-[11px] text-white"
            />
            {customText.trim() ? (
              <button
                type="button"
                onClick={() => stampBadgeText(customText.trim())}
                className="h-6 rounded bg-cyan-600 px-1.5 text-[10px] font-bold text-white hover:bg-cyan-500"
              >
                Stamp
              </button>
            ) : null}
          </div>
        </div>

        {/* Main Canvas Area */}
        <div className="relative flex-1 overflow-auto p-2 sm:p-4 flex items-center justify-center bg-slate-950">
          <canvas
            ref={canvasRef}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            className="w-full max-w-2xl aspect-[4/3] rounded-xl border border-slate-700 shadow-lg cursor-crosshair touch-none select-none"
            style={{ touchAction: "none" }}
          />
        </div>

        {/* Bottom Options & Privacy Settings */}
        <div className="border-t border-slate-800 bg-slate-900 p-3 sm:p-4 text-xs space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="sketch-title" className="text-slate-300">Sketch Title</Label>
              <Input
                id="sketch-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Master Bedroom Wall Crack"
                className="mt-1 h-8 bg-slate-800 border-slate-700 text-white text-xs"
              />
            </div>
            <div>
              <Label htmlFor="sketch-notes" className="text-slate-300">Written Instructions / Specs</Label>
              <Input
                id="sketch-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Scrape and apply mesh tape, prime with BIN"
                className="mt-1 h-8 bg-slate-800 border-slate-700 text-white text-xs"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4 pt-1 border-t border-slate-800/80">
            {/* Include in Proposal Toggle */}
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={includeInProposal}
                onChange={(e) => setIncludeInProposal(e.target.checked)}
                className="size-4 rounded border-slate-700 text-cyan-500 focus:ring-cyan-400 bg-slate-800"
              />
              <span className="flex items-center gap-1.5 font-medium text-slate-200">
                {includeInProposal ? (
                  <span className="text-cyan-400 flex items-center gap-1">
                    <Eye className="size-3.5" /> Included in Proposal
                  </span>
                ) : (
                  <span className="text-slate-400 flex items-center gap-1">
                    <EyeOff className="size-3.5" /> Private internal note (Hidden from customer)
                  </span>
                )}
              </span>
            </label>

            {/* Crew visibility */}
            <label className="flex items-center gap-2 cursor-pointer select-none text-slate-300">
              <input
                type="checkbox"
                checked={visibleToCrew}
                onChange={(e) => setVisibleToCrew(e.target.checked)}
                className="size-4 rounded border-slate-700 text-cyan-500 focus:ring-cyan-400 bg-slate-800"
              />
              <span>Visible to Crew Work Order</span>
            </label>

            <div className="flex items-center gap-2 ml-auto">
              <Button type="button" variant="ghost" size="sm" onClick={onClose} className="text-slate-400 hover:text-white h-8">
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleSave}
                className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold h-8 px-4"
              >
                Save Sketch & Notes
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
