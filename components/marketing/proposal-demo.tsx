"use client"

import { useState } from "react"
import { Play } from "lucide-react"

export function ProposalDemo() {
  const [playing, setPlaying] = useState(false)

  return (
    <section id="proposal-demo" className="scroll-mt-24 px-4 py-20 md:px-6">
      <div className="mx-auto grid max-w-6xl items-center gap-10 md:grid-cols-[0.8fr_1.2fr]">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Interactive Proposal Demo</h2>
          <p className="mt-3 text-sm leading-relaxed text-slate-300">
            A customer opens the link, plays the walkthrough on that line, and accepts without calling the office.
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
            <button
              type="button"
              data-testid="demo-play"
              className="mt-4 inline-flex items-center gap-2 rounded-full bg-slate-950 px-3 py-1.5 text-sm font-medium text-white"
              onClick={() => setPlaying(true)}
              aria-pressed={playing}
            >
              <Play className="size-3.5" aria-hidden="true" />
              {playing ? "Playing walkthrough" : "Play walkthrough"}
            </button>
            {playing ? (
              <p className="mt-3 rounded-lg bg-slate-100 px-3 py-6 text-center text-sm text-slate-600" data-testid="demo-playing">
                Walkthrough playing on this line.
              </p>
            ) : (
              <p className="sr-only">Walkthrough is ready on this line.</p>
            )}
          </div>
          <p className="mt-4 text-right text-sm text-slate-500">
            Total <span className="ml-2 text-lg font-semibold text-slate-900">$3,240</span>
          </p>
        </article>
      </div>
    </section>
  )
}
