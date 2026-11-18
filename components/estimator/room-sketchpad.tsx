"use client"

import { useEffect, useRef, useState, type PointerEvent } from "react"
import {
  Camera,
  Check,
  Circle,
  Download,
  Eraser,
  Eye,
  EyeOff,
  GripVertical,
  Maximize2,
  Paintbrush,
  Pencil,
  Printer,
  Redo2,
  RotateCcw,
  Square,
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
import type { AreaInput, RoomSketch, SketchTextItem } from "@/lib/types"

interface RoomSketchpadProps {
  room?: Partial<AreaInput>
  initialSketch?: RoomSketch | null
  onSave: (sketch: RoomSketch) => void
  onClose: () => void
}

type TransformMode = "move" | "nw" | "ne" | "se" | "sw" | "n" | "s" | "w" | "e"

interface DragTransformState {
  id: string
  mode: TransformMode
  startPointerX: number
  startPointerY: number
  startXPct: number
  startYPct: number
  startWidth: number
  startHeight: number
  containerWidth: number
  containerHeight: number
}

function getItemDimensions(item: SketchTextItem): { width: number; height: number } {
  if (item.width && item.height && item.width > 0 && item.height > 0) {
    return { width: item.width, height: item.height }
  }
  if (item.kind === "rect") {
    return { width: 160, height: 110 }
  }
  if (item.kind === "circle") {
    return { width: 130, height: 130 }
  }
  const textLen = (item.text || "").length
  const estimatedW = Math.max(130, Math.min(480, textLen * 11 + 32))
  const estimatedH = 42
  return {
    width: item.width || estimatedW,
    height: item.height || estimatedH,
  }
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
  const canvasContainerRef = useRef<HTMLDivElement | null>(null)
  const [tool, setTool] = useState<"pen" | "eraser" | "text">("pen")
  const [color, setColor] = useState<string>("#06b6d4")
  const [lineWidth, setLineWidth] = useState<number>(4)
  const [isDrawing, setIsDrawing] = useState(false)
  const [history, setHistory] = useState<ImageData[]>([])
  const [historyIndex, setHistoryIndex] = useState(-1)
  const roomName = room?.name || "Quick Note"
  const [backgroundImage, setBackgroundImage] = useState<string | undefined>(initialSketch?.backgroundImage)
  const [title, setTitle] = useState(initialSketch?.title || `${roomName} Sketch`)
  const [notes, setNotes] = useState(initialSketch?.notes || "")
  const [includeInProposal, setIncludeInProposal] = useState(initialSketch?.includeInProposal ?? false)
  const [visibleToCrew, setVisibleToCrew] = useState(initialSketch?.visibleToCrew ?? true)
  const [confirmClear, setConfirmClear] = useState(false)
  const [customText, setCustomText] = useState("")
  const [textItems, setTextItems] = useState<SketchTextItem[]>(initialSketch?.textItems || [])
  const [activeTextId, setActiveTextId] = useState<string | null>(null)
  const [isEditingText, setIsEditingText] = useState(false)
  const [dragTransform, setDragTransform] = useState<DragTransformState | null>(null)

  useEffect(() => {
    if (!dragTransform) return

    function onPointerMove(e: globalThis.PointerEvent) {
      if (!dragTransform) return
      const {
        id,
        mode,
        startPointerX,
        startPointerY,
        startXPct,
        startYPct,
        startWidth,
        startHeight,
        containerWidth,
        containerHeight,
      } = dragTransform

      const scaleX = 720 / Math.max(1, containerWidth)
      const scaleY = 540 / Math.max(1, containerHeight)
      const deltaX = (e.clientX - startPointerX) * scaleX
      const deltaY = (e.clientY - startPointerY) * scaleY

      const centerX0 = (startXPct / 100) * 720
      const centerY0 = (startYPct / 100) * 540
      const left0 = centerX0 - startWidth / 2
      const right0 = centerX0 + startWidth / 2
      const top0 = centerY0 - startHeight / 2
      const bottom0 = centerY0 + startHeight / 2

      const minW = 40
      const minH = 28

      let newLeft = left0
      let newRight = right0
      let newTop = top0
      let newBottom = bottom0

      if (mode === "move") {
        newLeft = left0 + deltaX
        newRight = right0 + deltaX
        newTop = top0 + deltaY
        newBottom = bottom0 + deltaY
      } else if (mode === "se") {
        newRight = Math.max(left0 + minW, right0 + deltaX)
        newBottom = Math.max(top0 + minH, bottom0 + deltaY)
      } else if (mode === "nw") {
        newLeft = Math.min(right0 - minW, left0 + deltaX)
        newTop = Math.min(bottom0 - minH, top0 + deltaY)
      } else if (mode === "ne") {
        newRight = Math.max(left0 + minW, right0 + deltaX)
        newTop = Math.min(bottom0 - minH, top0 + deltaY)
      } else if (mode === "sw") {
        newLeft = Math.min(right0 - minW, left0 + deltaX)
        newBottom = Math.max(top0 + minH, bottom0 + deltaY)
      } else if (mode === "e") {
        newRight = Math.max(left0 + minW, right0 + deltaX)
      } else if (mode === "w") {
        newLeft = Math.min(right0 - minW, left0 + deltaX)
      } else if (mode === "s") {
        newBottom = Math.max(top0 + minH, bottom0 + deltaY)
      } else if (mode === "n") {
        newTop = Math.min(bottom0 - minH, top0 + deltaY)
      }

      const calculatedW = Math.max(minW, Math.min(710, newRight - newLeft))
      const calculatedH = Math.max(minH, Math.min(530, newBottom - newTop))
      const newCenterX = (newLeft + newRight) / 2
      const newCenterY = (newTop + newBottom) / 2

      const newXPct = Math.max(2, Math.min(98, (newCenterX / 720) * 100))
      const newYPct = Math.max(2, Math.min(98, (newCenterY / 540) * 100))

      setTextItems((prev) =>
        prev.map((it) =>
          it.id === id
            ? {
                ...it,
                x: Math.round(newXPct * 10) / 10,
                y: Math.round(newYPct * 10) / 10,
                width: Math.round(calculatedW),
                height: Math.round(calculatedH),
              }
            : it,
        ),
      )
    }

    function onPointerUp() {
      setDragTransform(null)
    }

    window.addEventListener("pointermove", onPointerMove)
    window.addEventListener("pointerup", onPointerUp)
    window.addEventListener("pointercancel", onPointerUp)

    return () => {
      window.removeEventListener("pointermove", onPointerMove)
      window.removeEventListener("pointerup", onPointerUp)
      window.removeEventListener("pointercancel", onPointerUp)
    }
  }, [dragTransform])

  const dimensionsText = room?.lengthFt && room?.widthFt ? `${room.lengthFt}' × ${room.widthFt}' (${room.heightFt || 8}ft ceiling)` : ""

  // Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Set fixed internal resolution for consistent drawing
    canvas.width = 720
    canvas.height = 540

    const sourceImage = initialSketch?.rawImageData || initialSketch?.imageData
    if (sourceImage) {
      const img = new Image()
      img.onload = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height)
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
        saveState()
      }
      img.src = sourceImage
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
    if (tool === "text") {
      const canvas = canvasRef.current
      if (!canvas) return
      const rect = canvas.getBoundingClientRect()
      const xPct = Math.max(5, Math.min(95, ((event.clientX - rect.left) / rect.width) * 100))
      const yPct = Math.max(5, Math.min(95, ((event.clientY - rect.top) / rect.height) * 100))

      const newItem: SketchTextItem = {
        id: `txt_${crypto.randomUUID()}`,
        text: "New note",
        x: Math.round(xPct),
        y: Math.round(yPct),
        width: 140,
        height: 40,
        color: color || "#06b6d4",
        kind: "text",
        fontSize: 16,
      }
      setTextItems((prev) => [...prev, newItem])
      setActiveTextId(newItem.id)
      setIsEditingText(true)
      return
    }

    // Clicking blank canvas deselects any active item
    setActiveTextId(null)
    setIsEditingText(false)

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
    if (tool === "text") return
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
    if (tool === "text") return
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

  function handleTransformStart(
    event: React.PointerEvent,
    id: string,
    mode: TransformMode,
  ) {
    event.stopPropagation()
    event.preventDefault()
    const container = canvasContainerRef.current
    if (!container) return
    const rect = container.getBoundingClientRect()
    const item = textItems.find((it) => it.id === id)
    if (!item) return
    const dims = getItemDimensions(item)

    setActiveTextId(id)
    setDragTransform({
      id,
      mode,
      startPointerX: event.clientX,
      startPointerY: event.clientY,
      startXPct: item.x,
      startYPct: item.y,
      startWidth: dims.width,
      startHeight: dims.height,
      containerWidth: rect.width,
      containerHeight: rect.height,
    })
  }

  function addShape(kind: "rect" | "circle") {
    const newItem: SketchTextItem = {
      id: `shape_${crypto.randomUUID()}`,
      text: "",
      x: 50,
      y: 50,
      width: kind === "circle" ? 140 : 160,
      height: kind === "circle" ? 140 : 110,
      color: color || "#06b6d4",
      kind,
      borderWidth: Math.max(2, lineWidth),
      backgroundColor: "rgba(6, 182, 212, 0.12)",
    }
    setTextItems((prev) => [...prev, newItem])
    setActiveTextId(newItem.id)
    setIsEditingText(false)
  }

  function handleUpdateText(id: string, newText: string) {
    setTextItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, text: newText } : item)),
    )
  }

  function handleDeleteText(id: string) {
    setTextItems((prev) => prev.filter((item) => item.id !== id))
    if (activeTextId === id) {
      setActiveTextId(null)
      setIsEditingText(false)
    }
  }

  function renderCompositeCanvas(): HTMLCanvasElement {
    const canvas = canvasRef.current
    if (!canvas) throw new Error("Canvas element missing")

    const composite = document.createElement("canvas")
    composite.width = canvas.width
    composite.height = canvas.height
    const ctx = composite.getContext("2d")
    if (!ctx) return canvas

    // 1. Draw raw canvas (freehand strokes, photo/grid)
    ctx.drawImage(canvas, 0, 0)

    // 2. Draw placed items with exact dimensions and positions
    for (const item of textItems) {
      const dims = getItemDimensions(item)
      const pixelX = (item.x / 100) * composite.width
      const pixelY = (item.y / 100) * composite.height
      const pixelW = (dims.width / 720) * composite.width
      const pixelH = (dims.height / 540) * composite.height
      const left = pixelX - pixelW / 2
      const top = pixelY - pixelH / 2

      ctx.save()

      if (item.kind === "rect") {
        ctx.fillStyle = item.backgroundColor || "rgba(6, 182, 212, 0.15)"
        ctx.strokeStyle = item.color || "#06b6d4"
        ctx.lineWidth = item.borderWidth || 3
        ctx.beginPath()
        if (typeof ctx.roundRect === "function") {
          ctx.roundRect(left, top, pixelW, pixelH, 6)
        } else {
          ctx.rect(left, top, pixelW, pixelH)
        }
        ctx.fill()
        ctx.stroke()

        if (item.text && item.text.trim()) {
          const fontSize = item.fontSize || 16
          ctx.font = `bold ${fontSize}px system-ui, -apple-system, sans-serif`
          ctx.textAlign = "center"
          ctx.textBaseline = "middle"
          ctx.fillStyle = "#ffffff"
          ctx.fillText(item.text, pixelX, pixelY)
        }
      } else if (item.kind === "circle") {
        ctx.fillStyle = item.backgroundColor || "rgba(6, 182, 212, 0.15)"
        ctx.strokeStyle = item.color || "#06b6d4"
        ctx.lineWidth = item.borderWidth || 3
        ctx.beginPath()
        ctx.ellipse(pixelX, pixelY, pixelW / 2, pixelH / 2, 0, 0, Math.PI * 2)
        ctx.fill()
        ctx.stroke()

        if (item.text && item.text.trim()) {
          const fontSize = item.fontSize || 16
          ctx.font = `bold ${fontSize}px system-ui, -apple-system, sans-serif`
          ctx.textAlign = "center"
          ctx.textBaseline = "middle"
          ctx.fillStyle = "#ffffff"
          ctx.fillText(item.text, pixelX, pixelY)
        }
      } else {
        // Stamp or text badge
        if (item.text && item.text.trim()) {
          const fontSize = item.fontSize || 16
          ctx.fillStyle = item.backgroundColor || "rgba(15, 23, 42, 0.92)"
          ctx.strokeStyle = item.color || "#06b6d4"
          ctx.lineWidth = item.borderWidth || 2
          const radius = Math.min(10, pixelH / 2)
          ctx.beginPath()
          if (typeof ctx.roundRect === "function") {
            ctx.roundRect(left, top, pixelW, pixelH, radius)
          } else {
            ctx.rect(left, top, pixelW, pixelH)
          }
          ctx.fill()
          ctx.stroke()

          ctx.font = `bold ${fontSize}px system-ui, -apple-system, sans-serif`
          ctx.textAlign = "center"
          ctx.textBaseline = "middle"
          ctx.fillStyle = "#ffffff"
          ctx.fillText(item.text, pixelX, pixelY)
        }
      }

      ctx.restore()
    }

    return composite
  }

  function handlePrint() {
    const composite = renderCompositeCanvas()
    const dataUrl = composite.toDataURL("image/png")
    const printTitle = title.trim() || `${roomName} Sketch`

    const iframe = document.createElement("iframe")
    iframe.style.position = "fixed"
    iframe.style.right = "0"
    iframe.style.bottom = "0"
    iframe.style.width = "0"
    iframe.style.height = "0"
    iframe.style.border = "0"
    document.body.appendChild(iframe)

    const doc = iframe.contentWindow?.document
    if (!doc) return

    const escape = (str: string) =>
      str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")

    doc.open()
    doc.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${escape(printTitle)}</title>
          <style>
            @page {
              size: portrait;
              margin: 12mm;
            }
            * {
              box-sizing: border-box;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
              color: #0f172a;
              margin: 0;
              padding: 0;
              background: #ffffff;
            }
            .header {
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
              border-bottom: 2px solid #0891b2;
              padding-bottom: 10px;
              margin-bottom: 14px;
            }
            .brand {
              font-size: 13px;
              font-weight: 700;
              color: #0891b2;
              text-transform: uppercase;
              letter-spacing: 0.05em;
            }
            .title {
              font-size: 20px;
              font-weight: 800;
              color: #0f172a;
              margin: 3px 0 2px 0;
            }
            .meta {
              font-size: 13px;
              color: #475569;
            }
            .date-col {
              font-size: 12px;
              color: #64748b;
              text-align: right;
            }
            .canvas-box {
              width: 100%;
              text-align: center;
              margin-bottom: 14px;
              border: 1px solid #cbd5e1;
              border-radius: 8px;
              overflow: hidden;
              background: #1e293b;
            }
            .canvas-box img {
              display: block;
              width: 100%;
              max-height: 56vh;
              object-fit: contain;
              margin: 0 auto;
            }
            .notes-section {
              background: #f8fafc;
              border: 1px solid #e2e8f0;
              border-radius: 8px;
              padding: 12px 16px;
              margin-top: 10px;
            }
            .notes-header {
              font-size: 11px;
              font-weight: 700;
              color: #475569;
              text-transform: uppercase;
              letter-spacing: 0.05em;
              margin-bottom: 4px;
            }
            .notes-body {
              font-size: 13px;
              color: #0f172a;
              line-height: 1.5;
              white-space: pre-wrap;
            }
            .footer {
              margin-top: 14px;
              font-size: 10px;
              color: #94a3b8;
              text-align: center;
              border-top: 1px solid #f1f5f9;
              padding-top: 6px;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <div class="brand">Scopepipe • Job Sketch & Notes</div>
              <h1 class="title">${escape(printTitle)}</h1>
              ${dimensionsText ? `<div class="meta">Dimensions: <strong>${escape(dimensionsText)}</strong></div>` : ""}
            </div>
            <div class="date-col">
              <div>Date: ${new Date().toLocaleDateString()}</div>
              <div>${includeInProposal ? "Proposal Sheet" : "Internal Job Sheet"}</div>
            </div>
          </div>

          <div class="canvas-box">
            <img src="${dataUrl}" alt="Sketch Drawing" />
          </div>

          ${
            notes?.trim()
              ? `
          <div class="notes-section">
            <div class="notes-header">Written Instructions / Specs</div>
            <div class="notes-body">${escape(notes.trim())}</div>
          </div>
          `
              : ""
          }

          <div class="footer">
            Scopepipe Painting Estimator • ${escape(printTitle)}
          </div>
        </body>
      </html>
    `)
    doc.close()

    const img = doc.querySelector("img")
    const trigger = () => {
      setTimeout(() => {
        iframe.contentWindow?.focus()
        iframe.contentWindow?.print()
        setTimeout(() => iframe.remove(), 2000)
      }, 150)
    }

    if (img && !img.complete) {
      img.onload = trigger
      img.onerror = trigger
    } else {
      trigger()
    }
  }

  function stampBadgeText(textToStamp: string) {
    if (!textToStamp.trim()) return
    const trimmed = textToStamp.trim()
    const estimatedW = Math.max(160, Math.min(460, trimmed.length * 11 + 36))
    const newItem: SketchTextItem = {
      id: `stamp_${crypto.randomUUID()}`,
      text: trimmed,
      x: 50,
      y: 50,
      width: estimatedW,
      height: 44,
      color: color || "#06b6d4",
      kind: "stamp",
      fontSize: 16,
    }
    setTextItems((prev) => [...prev, newItem])
    setActiveTextId(newItem.id)
    setIsEditingText(false)
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
    const composite = renderCompositeCanvas()
    const imageData = composite.toDataURL("image/jpeg", 0.82)
    const rawImageData = canvas.toDataURL("image/jpeg", 0.82)
    const now = new Date().toISOString()

    const sketch: RoomSketch = {
      id: initialSketch?.id || `sketch_${crypto.randomUUID()}`,
      title: title.trim() || `${roomName} Sketch`,
      createdAt: initialSketch?.createdAt || now,
      updatedAt: now,
      imageData,
      rawImageData,
      backgroundImage,
      notes: notes.trim() || undefined,
      roomDimensionsText: dimensionsText,
      includeInProposal,
      visibleToCrew,
      textItems,
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
              <h3 className="text-sm font-bold leading-tight">{title || `${roomName} Sketch`}</h3>
              {dimensionsText ? <p className="text-[11px] text-slate-400">{dimensionsText}</p> : null}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handlePrint}
              data-testid="print-sketch-button"
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700 font-medium text-xs h-8 px-2.5"
            >
              <Printer className="size-3.5 mr-1 text-cyan-400" />
              <span>Print / PDF</span>
            </Button>
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
            <button
              type="button"
              onClick={() => setTool("text")}
              data-testid="text-tool-button"
              className={`flex items-center gap-1 rounded-lg px-2.5 py-1.5 font-medium transition-colors ${
                tool === "text" ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40" : "text-slate-300 hover:bg-slate-800"
              }`}
            >
              <Type className="size-3.5" />
              <span>Text</span>
            </button>
            <button
              type="button"
              onClick={() => addShape("rect")}
              data-testid="shape-box-button"
              className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 font-medium transition-colors text-slate-300 hover:bg-slate-800"
              title="Add Box / Rectangle shape"
            >
              <Square className="size-3.5" />
              <span>Box</span>
            </button>
            <button
              type="button"
              onClick={() => addShape("circle")}
              data-testid="shape-circle-button"
              className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 font-medium transition-colors text-slate-300 hover:bg-slate-800"
              title="Add Circle shape"
            >
              <Circle className="size-3.5" />
              <span>Circle</span>
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
            data-testid="stamp-dimensions-btn"
            onClick={() => stampBadgeText(dimensionsText)}
            className="rounded bg-slate-800 hover:bg-cyan-950 hover:text-cyan-300 border border-slate-700 px-2 py-0.5"
          >
            📐 {dimensionsText}
          </button>
          <button
            type="button"
            data-testid="stamp-patch-btn"
            onClick={() => stampBadgeText("⚠️ Drywall Repair / Patch")}
            className="rounded bg-slate-800 hover:bg-amber-950 hover:text-amber-300 border border-slate-700 px-2 py-0.5"
          >
            ⚠️ Patch/Repair
          </button>
          <button
            type="button"
            data-testid="stamp-door-btn"
            onClick={() => stampBadgeText("🚪 Door & Casing")}
            className="rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 px-2 py-0.5"
          >
            🚪 Door
          </button>
          <button
            type="button"
            data-testid="stamp-window-btn"
            onClick={() => stampBadgeText("🪟 Window Trim")}
            className="rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 px-2 py-0.5"
          >
            🪟 Window
          </button>
          <button
            type="button"
            data-testid="stamp-accent-btn"
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
                data-testid="stamp-custom-btn"
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
          <div
            ref={canvasContainerRef}
            className="relative w-full max-w-2xl aspect-[4/3] select-none"
          >
            <canvas
              ref={canvasRef}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
              className={`w-full h-full rounded-xl border border-slate-700 shadow-lg touch-none select-none ${
                tool === "text" ? "cursor-text" : "cursor-crosshair"
              }`}
              style={{ touchAction: "none" }}
            />

            {/* Overlaid Interactive Placed Items (Stamps, Shapes, Text Notes) */}
            {textItems.map((item) => {
              const isSelected = activeTextId === item.id
              const isEditing = isSelected && isEditingText
              const dims = getItemDimensions(item)
              const widthPct = (dims.width / 720) * 100
              const heightPct = (dims.height / 540) * 100
              const isCircle = item.kind === "circle"
              const isRect = item.kind === "rect"

              return (
                <div
                  key={item.id}
                  data-testid={`sketch-text-item-${item.id}`}
                  style={{
                    left: `${item.x}%`,
                    top: `${item.y}%`,
                    width: `${widthPct}%`,
                    height: `${heightPct}%`,
                    transform: "translate(-50%, -50%)",
                    touchAction: "none",
                  }}
                  className={`absolute z-20 select-none ${
                    isSelected ? "ring-2 ring-cyan-400 ring-offset-2 ring-offset-slate-950" : ""
                  } ${isCircle ? "rounded-full" : "rounded-lg"}`}
                  onClick={(e) => {
                    e.stopPropagation()
                    setActiveTextId(item.id)
                  }}
                >
                  {isEditing ? (
                    <div className="flex h-full w-full items-center justify-center gap-1 rounded-lg bg-slate-900 border-2 border-cyan-400 p-1 shadow-2xl">
                      <input
                        autoFocus
                        value={item.text}
                        onChange={(e) => handleUpdateText(item.id, e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === "Escape") {
                            setIsEditingText(false)
                          }
                        }}
                        className="h-full w-full rounded bg-slate-950 px-2 text-xs font-semibold text-white outline-none"
                        placeholder="Type text..."
                      />
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          setIsEditingText(false)
                        }}
                        className="rounded bg-cyan-500 hover:bg-cyan-400 p-1 text-slate-950"
                        title="Done"
                      >
                        <Check className="size-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDeleteText(item.id)
                        }}
                        className="rounded bg-rose-500/20 hover:bg-rose-500/40 p-1 text-rose-300"
                        title="Delete"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div
                      onPointerDown={(e) => handleTransformStart(e, item.id, "move")}
                      className={`relative flex h-full w-full cursor-move items-center justify-center p-1.5 shadow-md border ${
                        isCircle ? "rounded-full" : "rounded-lg"
                      }`}
                      style={{
                        backgroundColor:
                          item.backgroundColor ||
                          (isRect || isCircle ? "rgba(6, 182, 212, 0.12)" : "rgba(15, 23, 42, 0.92)"),
                        borderColor: item.color || "#06b6d4",
                        borderWidth: `${item.borderWidth || 2}px`,
                      }}
                    >
                      {/* Text content if present */}
                      {item.text ? (
                        <span
                          className="cursor-pointer select-none px-1 text-center font-bold text-white leading-tight"
                          style={{
                            fontSize: `${item.fontSize || 14}px`,
                            wordBreak: "break-word",
                          }}
                          onDoubleClick={(e) => {
                            e.stopPropagation()
                            setActiveTextId(item.id)
                            setIsEditingText(true)
                          }}
                        >
                          {item.text}
                        </span>
                      ) : null}

                      {/* Small Quick-Action Toolbar above object when selected */}
                      {isSelected ? (
                        <div
                          className="absolute -top-7 right-0 flex items-center gap-1 rounded bg-slate-900/95 border border-slate-700 px-1.5 py-0.5 shadow-lg z-30"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              setIsEditingText(true)
                            }}
                            className="rounded p-0.5 text-cyan-300 hover:bg-slate-800"
                            title="Edit text"
                          >
                            <Pencil className="size-3" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDeleteText(item.id)
                            }}
                            className="rounded p-0.5 text-rose-400 hover:bg-slate-800"
                            title="Delete item"
                          >
                            <Trash2 className="size-3" />
                          </button>
                        </div>
                      ) : null}

                      {/* 8 Draggable Corner & Edge Handles */}
                      {isSelected && !isEditing ? (
                        <>
                          {/* Top-Left Corner (NW) */}
                          <div
                            data-testid="handle-nw"
                            onPointerDown={(e) => handleTransformStart(e, item.id, "nw")}
                            title="Resize Corner (NW)"
                            className="absolute -top-1.5 -left-1.5 z-30 size-3 rounded-sm bg-white border-2 border-cyan-500 shadow-md cursor-nwse-resize touch-none select-none hover:scale-125 transition-transform"
                          />
                          {/* Top Edge (N) */}
                          <div
                            data-testid="handle-n"
                            onPointerDown={(e) => handleTransformStart(e, item.id, "n")}
                            title="Stretch Height (N)"
                            className="absolute -top-1.5 left-1/2 -translate-x-1/2 z-30 size-3 rounded-sm bg-white border-2 border-cyan-500 shadow-md cursor-ns-resize touch-none select-none hover:scale-125 transition-transform"
                          />
                          {/* Top-Right Corner (NE) */}
                          <div
                            data-testid="handle-ne"
                            onPointerDown={(e) => handleTransformStart(e, item.id, "ne")}
                            title="Resize Corner (NE)"
                            className="absolute -top-1.5 -right-1.5 z-30 size-3 rounded-sm bg-white border-2 border-cyan-500 shadow-md cursor-nesw-resize touch-none select-none hover:scale-125 transition-transform"
                          />
                          {/* Right Edge (E) */}
                          <div
                            data-testid="handle-e"
                            onPointerDown={(e) => handleTransformStart(e, item.id, "e")}
                            title="Stretch Width (E)"
                            className="absolute top-1/2 -right-1.5 -translate-y-1/2 z-30 size-3 rounded-sm bg-white border-2 border-cyan-500 shadow-md cursor-ew-resize touch-none select-none hover:scale-125 transition-transform"
                          />
                          {/* Bottom-Right Corner (SE) */}
                          <div
                            data-testid="handle-se"
                            onPointerDown={(e) => handleTransformStart(e, item.id, "se")}
                            title="Resize Corner (SE)"
                            className="absolute -bottom-1.5 -right-1.5 z-30 size-3 rounded-sm bg-white border-2 border-cyan-500 shadow-md cursor-nwse-resize touch-none select-none hover:scale-125 transition-transform"
                          />
                          {/* Bottom Edge (S) */}
                          <div
                            data-testid="handle-s"
                            onPointerDown={(e) => handleTransformStart(e, item.id, "s")}
                            title="Stretch Height (S)"
                            className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 z-30 size-3 rounded-sm bg-white border-2 border-cyan-500 shadow-md cursor-ns-resize touch-none select-none hover:scale-125 transition-transform"
                          />
                          {/* Bottom-Left Corner (SW) */}
                          <div
                            data-testid="handle-sw"
                            onPointerDown={(e) => handleTransformStart(e, item.id, "sw")}
                            title="Resize Corner (SW)"
                            className="absolute -bottom-1.5 -left-1.5 z-30 size-3 rounded-sm bg-white border-2 border-cyan-500 shadow-md cursor-nesw-resize touch-none select-none hover:scale-125 transition-transform"
                          />
                          {/* Left Edge (W) */}
                          <div
                            data-testid="handle-w"
                            onPointerDown={(e) => handleTransformStart(e, item.id, "w")}
                            title="Stretch Width (W)"
                            className="absolute top-1/2 -left-1.5 -translate-y-1/2 z-30 size-3 rounded-sm bg-white border-2 border-cyan-500 shadow-md cursor-ew-resize touch-none select-none hover:scale-125 transition-transform"
                          />
                        </>
                      ) : null}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
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
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handlePrint}
                className="bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700 font-medium text-xs h-8 px-2.5"
              >
                <Printer className="size-3.5 mr-1 text-cyan-400" />
                <span>Print / PDF</span>
              </Button>
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
