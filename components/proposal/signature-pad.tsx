"use client"

import { useEffect, useRef } from "react"

export function SignaturePad({
  onChange,
}: {
  onChange: (payload: string, hasInk: boolean) => void
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const drawing = useRef(false)
  const ink = useRef(false)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const ratio = window.devicePixelRatio || 1
    canvas.width = Math.max(1, Math.round(rect.width * ratio))
    canvas.height = Math.max(1, Math.round(rect.height * ratio))
    const context = canvas.getContext("2d")
    if (!context) return
    context.scale(ratio, ratio)
    context.lineWidth = 2.2
    context.lineCap = "round"
    context.lineJoin = "round"
    context.strokeStyle = "#1c1917"
  }, [])

  const point = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return null
    const rect = canvas.getBoundingClientRect()
    return { x: event.clientX - rect.left, y: event.clientY - rect.top }
  }

  const publish = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    onChange(ink.current ? canvas.toDataURL("image/png") : "", ink.current)
  }

  return (
    <div className="grid gap-2">
      <canvas
        ref={canvasRef}
        data-testid="signature-pad"
        className="h-36 w-full touch-none rounded-xl border border-dashed border-input bg-white"
        aria-label="Signature"
        onPointerDown={(event) => {
          const start = point(event)
          const context = canvasRef.current?.getContext("2d")
          if (!start || !context) return
          drawing.current = true
          ink.current = true
          event.currentTarget.setPointerCapture(event.pointerId)
          context.beginPath()
          context.moveTo(start.x, start.y)
        }}
        onPointerMove={(event) => {
          if (!drawing.current) return
          const next = point(event)
          const context = canvasRef.current?.getContext("2d")
          if (!next || !context) return
          context.lineTo(next.x, next.y)
          context.stroke()
        }}
        onPointerUp={() => {
          drawing.current = false
          publish()
        }}
        onPointerCancel={() => {
          drawing.current = false
          publish()
        }}
      />
      <button
        type="button"
        className="self-start text-sm text-muted-foreground"
        onClick={() => {
          const canvas = canvasRef.current
          const context = canvas?.getContext("2d")
          if (!canvas || !context) return
          context.clearRect(0, 0, canvas.width, canvas.height)
          ink.current = false
          onChange("", false)
        }}
      >
        Clear signature
      </button>
    </div>
  )
}
