"use client"

import { useEffect, useState } from "react"
import { Layers, Paintbrush, Play, Wrench } from "lucide-react"

type TradeKey = "painting" | "drywall" | "flooring"

interface ProposalDemoProps {
  lang?: "en" | "es"
}

export function ProposalDemo({ lang = "en" }: ProposalDemoProps) {
  const isEs = lang === "es"
  const [activeTrade, setActiveTrade] = useState<TradeKey>("painting")
  const [playing, setPlaying] = useState(false)
  const [frame, setFrame] = useState(0)

  const FRAMES = [
    {
      title: isEs ? "Entrada principal" : "Front walk",
      detail: isEs ? "Camino hacia la puerta principal" : "Up the path to the front door",
      x: 0,
    },
    {
      title: isEs ? "Elevación frontal" : "Front elevation",
      detail: isEs ? "Puerta, ventanas y revestimiento" : "Door, windows, and siding",
      x: 70,
    },
    {
      title: isEs ? "Pared lateral" : "Side wall",
      detail: isEs ? "Alrededor de la esquina de la casa" : "Around the corner of the house",
      x: 150,
    },
    {
      title: isEs ? "Vista de calle" : "Street view",
      detail: isEs ? "Todo el exterior de la propiedad" : "The whole exterior",
      x: 40,
    },
  ] as const

  useEffect(() => {
    if (!playing) return
    const timer = window.setInterval(() => {
      setFrame((current) => (current + 1) % FRAMES.length)
    }, 1400)
    return () => window.clearInterval(timer)
  }, [playing, FRAMES.length])

  const scene = FRAMES[frame] ?? FRAMES[0]

  return (
    <div className="px-4 py-20 md:px-6">
      <div className="mx-auto grid max-w-6xl items-center gap-10 md:grid-cols-[0.85fr_1.15fr]">
        <div>
          <span className="text-xs font-bold tracking-wider uppercase text-cyan-400">
            {isEs ? "Propuesta Interactiva para Clientes" : "Interactive Customer Proposal"}
          </span>
          <h2 className="mt-2 text-3xl font-bold tracking-tight text-white sm:text-4xl">
            {isEs ? "Propuesta de muestra" : "Sample proposal"}
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-slate-300">
            {isEs
              ? "Esta es la página interactiva que tu cliente abre en su teléfono. Cambia de oficio o reproduce el recorrido para ver cómo las partidas claras, fotos y recorridos en video generan confianza inmediata antes de la firma digital."
              : "This is the interactive page your customer opens on their phone. Switch trades or press play to see how clear line items, photos, and video walkthroughs build instant trust before they sign."}
          </p>

          {/* Trade switcher pills */}
          <div className="mt-6 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setActiveTrade("painting")}
              className={`inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all ${
                activeTrade === "painting"
                  ? "bg-cyan-400 text-slate-950 font-bold shadow-md shadow-cyan-500/20"
                  : "bg-white/10 text-slate-300 hover:bg-white/15 hover:text-white border border-white/10"
              }`}
            >
              <Paintbrush className="size-3.5" />
              <span>{isEs ? "Pintura" : "Painting"}</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTrade("drywall")}
              className={`inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all ${
                activeTrade === "drywall"
                  ? "bg-cyan-400 text-slate-950 font-bold shadow-md shadow-cyan-500/20"
                  : "bg-white/10 text-slate-300 hover:bg-white/15 hover:text-white border border-white/10"
              }`}
            >
              <Layers className="size-3.5" />
              <span>{isEs ? "Paneles de yeso" : "Drywall"}</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTrade("flooring")}
              className={`inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all ${
                activeTrade === "flooring"
                  ? "bg-cyan-400 text-slate-950 font-bold shadow-md shadow-cyan-500/20"
                  : "bg-white/10 text-slate-300 hover:bg-white/15 hover:text-white border border-white/10"
              }`}
            >
              <Wrench className="size-3.5" />
              <span>{isEs ? "Pisos" : "Flooring"}</span>
            </button>
          </div>

          <a
            href="/sample-proposal"
            className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-cyan-300 hover:text-white transition-colors"
          >
            {isEs ? "Abrir propuesta de muestra completa →" : "Open the full sample proposal →"}
          </a>
        </div>

        <article className="rounded-2xl border border-white/10 bg-white p-6 text-slate-900 shadow-2xl shadow-cyan-500/10">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <div>
              <p className="text-[11px] font-bold tracking-wider text-cyan-800 uppercase">
                {isEs ? "Propuesta Scopepipe" : "Scopepipe Proposal"}
              </p>
              <h3 className="text-lg font-bold text-slate-900">
                {activeTrade === "painting" && (isEs ? "Repintado Interior y Molduras" : "Master Bedroom & Bath Repaint")}
                {activeTrade === "drywall" && (isEs ? "Instalación de Yeso y Acabado Nivel 4" : "Great Room Drywall & Level 4 Finish")}
                {activeTrade === "flooring" && (isEs ? "Lijado y Barnizado de Madera" : "Hardwood Refinishing — Sand, Stain & Clear Coat")}
              </h3>
            </div>
            <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800 border border-emerald-200">
              {isEs ? "Listo para Firma" : "Ready to Sign"}
            </span>
          </div>

          {activeTrade === "painting" && (
            <div className="mt-4 rounded-xl border border-slate-200 p-4 bg-slate-50">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-bold text-slate-900">{isEs ? "Recorrido Exterior y Elevación" : "Front Elevation Walkthrough"}</p>
                  <p className="text-xs text-slate-500">
                    {isEs
                      ? "Paredes (540 sq ft SW Repose Gray), 76 LF molduras, 2 puertas, techo"
                      : "Walls (540 sq ft SW Repose Gray), 76 LF baseboards, 2 doors, ceiling"}
                  </p>
                </div>
                <p className="font-extrabold text-slate-900 text-lg">$1,480</p>
              </div>

              <div className="relative mt-4 aspect-video overflow-hidden rounded-xl bg-slate-950">
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
                    <span className="inline-flex items-center gap-2 rounded-full bg-cyan-400 px-3.5 py-1.5 text-xs font-bold text-slate-950 shadow-md hover:bg-cyan-300 transition-colors">
                      <Play className="size-3.5 fill-slate-950" aria-hidden="true" />
                      {isEs ? "Reproducir recorrido" : "Play walkthrough"}
                    </span>
                  </button>
                )}
              </div>

              <div className="mt-3 flex items-center justify-between text-xs text-slate-500 border-t border-slate-200 pt-2">
                <span>{isEs ? "Lista de compra calculada:" : "Calculated store buy list:"}</span>
                <span className="font-semibold text-slate-800">{isEs ? "5 Galones (Botes completos)" : "5 Gallons (Whole cans)"}</span>
              </div>
            </div>
          )}

          {activeTrade === "drywall" && (
            <div className="mt-4 rounded-xl border border-slate-200 p-4 bg-slate-50 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-bold text-slate-900">{isEs ? "Colgado y Acabado de Láminas" : "Sheetrock Hang & Smooth Finish"}</p>
                  <p className="text-xs text-slate-500">
                    {isEs
                      ? "48 láminas 4'×8' 1/2\", Acabado Nivel 4 liso, listo para pintar"
                      : "48 sheets 4'×8' 1/2\", Level 4 smooth finish, primed and sanded"}
                  </p>
                </div>
                <p className="font-extrabold text-slate-900 text-lg">$3,600</p>
              </div>

              <div className="rounded-lg bg-white p-3 border border-slate-200 space-y-1.5 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>{isEs ? "Láminas de Yeso (4'×8' 1/2\")" : "Drywall Sheets (4'×8' 1/2\")"}</span>
                  <span className="font-semibold text-slate-900">48 {isEs ? "láminas" : "sheets"}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>{isEs ? "Compuesto para Juntas (Cubetas 4.5 gal)" : "Joint Compound (4.5 gal buckets)"}</span>
                  <span className="font-semibold text-slate-900">6 {isEs ? "cubetas" : "buckets"}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>{isEs ? "Cinta de papel y tornillos 1-1/4\"" : "Paper tape & 1-1/4\" screws"}</span>
                  <span className="font-semibold text-slate-900">4 {isEs ? "rollos" : "rolls"} + 2 {isEs ? "cajas" : "boxes"}</span>
                </div>
                <div className="flex justify-between text-slate-600 border-t border-slate-100 pt-1.5">
                  <span>{isEs ? "Nivel de acabado especificado" : "Specified finish level"}</span>
                  <span className="font-bold text-cyan-700">{isEs ? "Nivel 4 (Listo para color)" : "Level 4 (Prime ready)"}</span>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
                <span>{isEs ? "Tarifa por lámina colgada y terminada:" : "Hang, tape & finish unit rate:"}</span>
                <span className="font-semibold text-slate-800">$75.00 / {isEs ? "lámina" : "sheet"}</span>
              </div>
            </div>
          )}

          {activeTrade === "flooring" && (
            <div className="mt-4 rounded-xl border border-slate-200 p-4 bg-slate-50 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-bold text-slate-900">{isEs ? "Lijado, Tinte y Capa Transparente" : "Sand, Stain & Clear Coat"}</p>
                  <p className="text-xs text-slate-500">
                    {isEs
                      ? "1,300 sq. ft. Roble Sala y Comedor @ $8.00/sq. ft."
                      : "1,300 sq. ft. Oak Living & Dining Room @ $8.00/sq. ft."}
                  </p>
                </div>
                <p className="font-extrabold text-slate-900 text-lg">$10,400</p>
              </div>

              <div className="rounded-lg bg-white p-3 border border-slate-200 space-y-1.5 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>{isEs ? "Tipo de trabajo" : "Job Type"}</span>
                  <span className="font-semibold text-slate-900">{isEs ? "Lijado y Barnizado de Madera" : "Refinish Existing Hardwood"}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>{isEs ? "Servicio" : "Service"}</span>
                  <span className="font-semibold text-slate-900">{isEs ? "Lijado, Tinte y Sellador Transparente" : "Sand, Stain & Clear Coat"}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>{isEs ? "Área neta calculada" : "Net Hardwood Area"}</span>
                  <span className="font-semibold text-slate-900">1,300 sq. ft.</span>
                </div>
                <div className="flex justify-between text-slate-600 border-t border-slate-100 pt-1.5">
                  <span>{isEs ? "Precio final de venta por sq. ft." : "Final Selling Price per sq. ft."}</span>
                  <span className="font-bold text-cyan-700">$8.00 / sq. ft.</span>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
                <span>{isEs ? "Opciones de escaleras y reparaciones:" : "Optional stairs & repair add-ons:"}</span>
                <span className="font-semibold text-slate-800">{isEs ? "Disponibles por partida" : "Itemized separately"}</span>
              </div>
            </div>
          )}

          <div className="mt-4 flex items-center justify-between border-t border-slate-200 pt-3">
            <span className="text-xs font-semibold text-slate-500">
              {isEs ? "Valor Total de la Propuesta:" : "Total Proposal Value:"}
            </span>
            <span className="text-xl font-extrabold text-slate-900">
              {activeTrade === "painting" && "$1,480.00"}
              {activeTrade === "drywall" && "$3,600.00"}
              {activeTrade === "flooring" && "$10,400.00"}
            </span>
          </div>
        </article>
      </div>
    </div>
  )
}

function HouseWalkthrough({ x }: { x: number }) {
  return (
    <svg viewBox={`${x} 0 320 180`} className="size-full" role="img" aria-label="Home exterior walkthrough">
      <rect x="-40" width="560" height="180" fill="#8fb7d6" />
      <rect x="-40" y="132" width="560" height="48" fill="#6f8f62" />
      <path d="M20 132 C70 118 110 124 150 132" fill="none" stroke="#d9d3c7" strokeWidth="10" />
      <polygon points="70,86 190,36 310,86" fill="#5c534c" />
      <rect x="110" y="86" width="160" height="60" fill="#f4ede1" />
      <polygon points="120,62 140,62 140,86 120,86" fill="#7a2e22" />
      <rect x="175" y="102" width="30" height="44" fill="#1b2a47" />
      <rect x="130" y="98" width="28" height="24" fill="#ffffff" stroke="#9bb1c9" strokeWidth="2" />
      <rect x="222" y="98" width="28" height="24" fill="#ffffff" stroke="#9bb1c9" strokeWidth="2" />
    </svg>
  )
}
