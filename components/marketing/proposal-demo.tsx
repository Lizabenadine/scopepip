"use client"

import { useEffect, useState } from "react"
import { Play } from "lucide-react"

const FRAMES = [
  { title: "Front walk", detail: "Up the path to the front door", x: 0 },
  { title: "Front elevation", detail: "Door, windows, and siding", x: 70 },
  { title: "Side wall", detail: "Around the corner of the house", x: 150 },
  { title: "Street view", detail: "The whole exterior", x: 40 },
] as const

export function ProposalDemo() {
  const [playing, setPlaying] = useState(false)
  const [frame, setFrame] = useState(0)

  useEffect(() => {
    if (!playing) return
    const timer = window.setInterval(() => {
      setFrame((current) => (current + 1) % FRAMES.length)
    }, 1400)
    return () => window.clearInterval(timer)
  }, [playing])

  const scene = FRAMES[frame] ?? FRAMES[0]

  return (
    <section id="proposal-demo" className="scroll-mt-24 px-4 py-20 md:px-6">
      <div className="mx-auto grid max-w-6xl items-center gap-10 md:grid-cols-[0.8fr_1.2fr]">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Sample proposal</h2>
          <p className="mt-3 text-sm leading-relaxed text-slate-300">
            This is the page the customer opens. Press play and the view walks around the outside of the house.
          </p>
        </div>
        <article className="rounded-2xl border border-white/10 bg-white p-5 text-slate-900 shadow-2xl shadow-blue-500/10">
          <p className="text-xs font-medium tracking-wide text-slate-500 uppercase">Sample proposal</p>
          <h3 className="mt-1 text-xl font-semibold">Exterior and trim</h3>
          <div className="mt-4 rounded-xl border border-slate-200 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-medium">Front elevation</p>
                <p className="text-sm text-slate-500">Two coats, body and trim</p>
              </div>
              <p className="font-semibold">$3,240</p>
            </div>
            <div className="relative mt-4 aspect-video overflow-hidden rounded-xl bg-slate-900">
              <HouseWalkthrough x={scene.x} />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/80 to-transparent px-3 pt-8 pb-3 text-white">
                <p className="text-sm font-semibold">{scene.title}</p>
                <p className="text-xs text-slate-200">{scene.detail}</p>
              </div>
              {playing ? (
                <p className="sr-only" data-testid="demo-playing" aria-live="polite">
                  {scene.title}. {scene.detail}
                </p>
              ) : (
                <button
                  type="button"
                  data-testid="demo-play"
                  className="absolute inset-0 grid place-items-center"
                  aria-pressed={false}
                  onClick={() => {
                    setFrame(0)
                    setPlaying(true)
                  }}
                >
                  <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-sm font-medium text-slate-950 shadow-md">
                    <Play className="size-3.5" aria-hidden="true" />
                    Play walkthrough
                  </span>
                </button>
              )}
            </div>
          </div>
          <p className="mt-4 text-right text-sm text-slate-500">
            Total <span className="ml-2 text-lg font-semibold text-slate-900">$3,240</span>
          </p>
        </article>
      </div>
    </section>
  )
}

function HouseWalkthrough({ x }: { x: number }) {
  return (
    <svg viewBox={`${x} 0 320 180`} className="size-full" role="img" aria-label="Home exterior walkthrough">
      <rect x="-40" width="560" height="180" fill="#8fb7d6" />
      <rect x="-40" y="132" width="560" height="48" fill="#6f8f62" />
      <path d="M20 132 C70 118 110 124 150 132" fill="none" stroke="#d9d3c7" strokeWidth="10" />
      <polygon points="70,86 190,36 310,86" fill="#5c534c" />
      <rect x="88" y="86" width="204" height="58" fill="#f4efe6" />
      <rect x="88" y="86" width="204" height="6" fill="#f7f7f5" />
      <rect x="88" y="138" width="204" height="6" fill="#f7f7f5" />
      <rect x="118" y="100" width="26" height="38" fill="#243044" />
      <rect x="168" y="100" width="34" height="20" fill="#dbe7f3" />
      <rect x="220" y="100" width="34" height="20" fill="#dbe7f3" />
      <rect x="292" y="86" width="92" height="58" fill="#e7e1d6" />
      <polygon points="292,86 338,52 384,86" fill="#5c534c" />
      <rect x="316" y="104" width="28" height="20" fill="#dbe7f3" />
      <rect x="40" y="108" width="10" height="28" fill="#6b4f32" />
      <circle cx="45" cy="96" r="14" fill="#3f6b45" />
    </svg>
  )
}
