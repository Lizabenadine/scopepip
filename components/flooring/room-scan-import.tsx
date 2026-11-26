"use client"

import { useRef, useState } from "react"
import type { FlooringRoom } from "@/lib/estimate/multi-trade-types"
import { maxRoomScanBytes, parseFlooringRoomScan, type FlooringRoomScan } from "@/lib/flooring/room-scan"

export function RoomScanImport({ rooms, onImport }: {
  rooms: FlooringRoom[]
  onImport: (scan: FlooringRoomScan, roomId: string) => void
}) {
  const dialog = useRef<HTMLDialogElement>(null)
  const [scan, setScan] = useState<FlooringRoomScan | null>(null)
  const [area, setArea] = useState("")
  const [roomId, setRoomId] = useState("")
  const [error, setError] = useState("")
  const [reading, setReading] = useState(false)

  async function readScan(file: File) {
    setScan(null)
    setError("")
    if (file.size > maxRoomScanBytes) {
      setError("Choose the small JSON measurement file exported from Scopepipe Room Scanner.")
      return
    }
    setReading(true)
    try {
      const result = parseFlooringRoomScan(await file.text())
      setScan(result)
      setArea(String(Math.round(result.areaSqFt * 100) / 100))
    } catch (error) {
      setError(error instanceof Error && !(error instanceof SyntaxError)
        ? error.message
        : "This file could not be read. Choose a Scopepipe room scan JSON file.")
    } finally {
      setReading(false)
    }
  }

  return (
    <>
      <button
        type="button"
        className="rounded-xl bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100"
        onClick={() => {
          setRoomId("")
          setScan(null)
          setError("")
          dialog.current?.showModal()
        }}
      >
        Scan Room
      </button>
      <dialog ref={dialog} aria-label="Scan Room" className="m-auto w-[min(92vw,28rem)] rounded-2xl border border-slate-200 bg-white p-6 text-slate-900 shadow-xl backdrop:bg-slate-950/50">
        <h2 className="text-lg font-bold">Scan Room</h2>
        <p className="mt-2 text-sm text-slate-600">
          Open Scopepipe Room Scanner on a LiDAR iPhone. Scan and review one room, then save its measurements to Files. Choose that JSON file here.
        </p>
        <label className="mt-4 block text-sm font-semibold">
          Measurement file
          <input
            type="file"
            accept=".json,application/json"
            className="mt-2 block w-full text-sm"
            disabled={reading}
            onChange={(event) => {
              const file = event.currentTarget.files?.[0]
              event.currentTarget.value = ""
              if (file) void readScan(file)
            }}
          />
        </label>
        {error && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}
        {scan && (
          <form
            className="mt-4 space-y-3"
            onSubmit={(event) => {
              event.preventDefault()
              const areaSqFt = Number(area)
              if (areaSqFt < 0.01 || areaSqFt > 100_000 || !Number.isFinite(areaSqFt)) return
              onImport({ ...scan, areaSqFt }, roomId)
              dialog.current?.close()
            }}
          >
            <p className="text-sm text-slate-600">{scan.lengthFt.toFixed(1)} × {scan.widthFt.toFixed(1)} ft bounding dimensions · {scan.perimeterFt.toFixed(1)} ft perimeter</p>
            <label className="block text-sm font-semibold">
              Confirm floor area (sq ft)
              <input type="number" required min="0.01" max="100000" step="0.01" value={area}
                onChange={(event) => setArea(event.target.value)} className="mt-1 block w-full rounded-lg border p-2" />
            </label>
            <label className="block text-sm font-semibold">
              Apply measurements to
              <select value={roomId} onChange={(event) => setRoomId(event.target.value)} className="mt-1 block w-full rounded-lg border p-2">
                <option value="">New room</option>
                {rooms.map((room) => <option key={room.id} value={room.id}>{room.name}</option>)}
              </select>
            </label>
            <button type="submit" className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white">Use in Estimate</button>
          </form>
        )}
        <button type="button" disabled={reading} onClick={() => dialog.current?.close()} className="mt-4 text-sm font-semibold text-slate-700">Cancel</button>
      </dialog>
    </>
  )
}
