"use client"

export function PrintGuideButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="rounded-full bg-cyan-400 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-cyan-300"
    >
      Print / Save PDF
    </button>
  )
}
