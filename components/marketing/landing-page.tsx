"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { BrandLogo } from "@/components/brand/brand-logo"
import {
  ArrowRight,
  BellRing,
  Check,
  CheckCircle2,
  FileCheck2,
  Languages,
  Layers,
  MessageSquare,
  Mic,
  Paintbrush,
  Pencil,
  Play,
  Ruler,
  Smartphone,
  Sparkles,
  Users,
  Wrench,
} from "lucide-react"
import { ProposalDemo } from "@/components/marketing/proposal-demo"
import { SiteFooter } from "@/components/marketing/site-footer"

type TradeKey = "painting" | "drywall" | "flooring"

export function LandingPage() {
  const [lang, setLang] = useState<"en" | "es">("en")
  const [activeTrade, setActiveTrade] = useState<TradeKey>("painting")

  useEffect(() => {
    try {
      const saved = localStorage.getItem("scopepipe_lang")
      if (saved === "es" || saved === "en") {
        setLang(saved)
      }
    } catch {
      // localStorage may be disabled
    }
  }, [])

  const setLanguage = (newLang: "en" | "es") => {
    setLang(newLang)
    try {
      localStorage.setItem("scopepipe_lang", newLang)
    } catch {
      // Ignore
    }
  }

  const isEs = lang === "es"

  const NAV = [
    { href: "#trades", label: isEs ? "Oficios" : "Trades" },
    { href: "#features", label: isEs ? "Funciones" : "Features" },
    { href: "#how-it-works", label: isEs ? "Cómo Funciona" : "How It Works" },
    { href: "#proposal-demo", label: isEs ? "Propuesta" : "Sample Proposal" },
    { href: "#pricing", label: isEs ? "Precios" : "Pricing" },
    { href: "/help", label: isEs ? "Ayuda" : "Help" },
  ] as const

  const SHARED_WORKFLOW_FEATURES = [
    {
      icon: Smartphone,
      stage: isEs ? "Paso 1: Medir" : "Step 1: Measure",
      title: isEs ? "Despegues Móviles en la Obra" : "Fast Mobile Jobsite Takeoffs",
      tagline: isEs ? "Pintura, paneles de yeso y pisos." : "Built for the field, not the desk.",
      body: isEs
        ? "Ingresa dimensiones de habitaciones, conteos de láminas de yeso o pies cuadrados de pisos mientras caminas la propiedad con el cliente."
        : "Enter room dimensions, drywall sheet counts, or flooring square footage on your phone while walking the jobsite with the property owner.",
    },
    {
      icon: Pencil,
      stage: isEs ? "Paso 1: Medir" : "Step 1: Measure",
      title: isEs ? "Croquis, Notas y Fotos Marcadas" : "Sketch & Notes + Photo Markup",
      tagline: isEs ? "Incluido en todos los planes." : "Included across all plans.",
      body: isEs
        ? "Dibuja planos a mano alzada, anota reparaciones, estampa medidas y dibuja directamente sobre fotos de daños con tu dedo o lápiz óptico."
        : "Draw freehand room layouts, stamp dimensions, and sketch directly over jobsite photos to clearly highlight repair spots and transition lines.",
    },
    {
      icon: Mic,
      stage: isEs ? "Paso 1: Medir" : "Step 1: Measure",
      title: isEs ? "Dictado por Voz Manos Libres" : "Hands-Free Voice Dictation",
      tagline: isEs ? "Dicta especificaciones al caminar (Business)." : "Dictate specs hands-free as you walk (Business).",
      body: isEs
        ? "Toca el micrófono en cualquier campo de notas para transcribir peticiones del cliente, reparaciones y condiciones de obra con voz nativa móvil."
        : "Tap the microphone beside any estimate note field to transcribe customer requests, prep notes, and surface conditions using mobile speech recognition.",
    },
    {
      icon: FileCheck2,
      stage: isEs ? "Paso 2: Enviar" : "Step 2: Send",
      title: isEs ? "Propuestas con Recorridos y Firma" : "Proposals with Video & E-Signature",
      tagline: isEs ? "Genera confianza inmediata." : "Build immediate trust on any device.",
      body: isEs
        ? "Presenta partidas detalladas por oficio con recorridos opcionales en video y especificaciones bloqueadas. Tu cliente revisa y firma en su teléfono."
        : "Present itemized trade scopes with optional line-item video walkthroughs and locked specifications. The client reviews and e-signs directly on their phone.",
    },
    {
      icon: BellRing,
      stage: isEs ? "Paso 2: Enviar" : "Step 2: Send",
      title: isEs ? "Recordatorios Inteligentes a 3 y 7 Días" : "Smart 3 & 7-Day Follow-Up Engine",
      tagline: isEs ? "Gana los estimados enviados (Business)." : "Close sent proposals before they go cold (Business).",
      body: isEs
        ? "No dejes que se enfríen las propuestas. Recordatorios automatizados con texto personalizado en 1 clic que se detienen al momento de la firma."
        : "Never lose an unaccepted proposal. One-click personalized follow-up messages automatically stop the moment a customer accepts or signs.",
    },
    {
      icon: Languages,
      stage: isEs ? "Paso 3: Compartir" : "Step 3: Share",
      title: isEs ? "Órdenes de Trabajo Bilingües" : "Bilingual Crew Work Orders",
      tagline: isEs ? "Inglés y Español en todos los planes." : "1-tap English & Spanish on all plans.",
      body: isEs
        ? "Tu cuadrilla alterna entre inglés y español en obra con 1 toque. Las listas de materiales y tareas quedan claras mientras tus precios y márgenes se mantienen privados."
        : "The crew toggles between English and Spanish on the jobsite with one tap. Color codes, prep tasks, and material lists stay clear while your margins stay private.",
    },
  ] as const

  const WORKFLOW_STEPS = [
    {
      step: "01",
      title: isEs ? "Mide la Obra" : "Measure the Job",
      desc: isEs
        ? "Mide habitaciones o anota áreas de pintura, láminas de yeso o pies cuadrados de pisos. Dibuja croquis, marca fotos de reparaciones o dicta notas con voz. Scopepipe calcula cantidades y precios al instante."
        : "Measure rooms or enter square footage for painting, drywall, or flooring. Freehand draw sketches, markup photos of repairs, or dictate notes. Scopepipe calculates takeoffs and pricing in seconds.",
    },
    {
      step: "02",
      title: isEs ? "Envía la Propuesta" : "Send the Proposal",
      desc: isEs
        ? "Genera una propuesta profesional con partidas por oficio, recorridos opcionales en video y especificaciones bloqueadas. El cliente recibe un enlace móvil y firma electrónicamente."
        : "Generate an itemized proposal with clear trade scopes, optional video walkthroughs, and locked specifications. The homeowner receives a mobile link and signs digitally.",
    },
    {
      step: "03",
      title: isEs ? "Comparte la Orden de Trabajo" : "Share the Crew Work Order",
      desc: isEs
        ? "Despacha al equipo con órdenes de trabajo bilingües en inglés o español. Incluye listas de materiales sin precios y tareas de preparación sin exponer tus costos ni márgenes."
        : "Dispatch your crew with bilingual work orders in English or Spanish. Share price-free material buy lists and prep instructions while keeping your costs and profit margins strictly private.",
    },
  ] as const

  const COMPARISON_ROWS = [
    {
      feature: isEs ? "Estimados móviles para pintura, yeso y pisos" : "Mobile estimating for painting, drywall & flooring",
      starter: true,
      pro: true,
      business: true,
    },
    {
      feature: isEs ? "Propuestas profesionales y firma electrónica" : "Professional proposals & e-signatures",
      starter: true,
      pro: true,
      business: true,
    },
    {
      feature: isEs ? "Listas de compra de materiales sin precios" : "Price-free material buy lists (paint, drywall, flooring)",
      starter: true,
      pro: true,
      business: true,
    },
    {
      feature: isEs ? "Lijado de pisos de madera y cálculo de instalación" : "Hardwood refinishing & installation calculator",
      starter: true,
      pro: true,
      business: true,
    },
    {
      feature: isEs ? "Pipeline de ventas y seguimiento de prospectos" : "Sales pipeline & lead tracking",
      starter: true,
      pro: true,
      business: true,
    },
    {
      feature: isEs ? "Órdenes de trabajo bilingües (Inglés y Español)" : "Bilingual crew work orders (English & Spanish)",
      starter: "✓ " + (isEs ? "Todos los planes" : "All plans"),
      pro: "✓ " + (isEs ? "Todos los planes" : "All plans"),
      business: "✓ " + (isEs ? "Todos los planes" : "All plans"),
    },
    {
      feature: isEs ? "Croquis y notas con fotos marcadas" : "Sketch & Notes with photo markup",
      starter: "✓ " + (isEs ? "Todos los planes" : "All planes"),
      pro: "✓ " + (isEs ? "Todos los planes" : "All plans"),
      business: "✓ " + (isEs ? "Todos los planes" : "All plans"),
    },
    {
      feature: isEs ? "Recorridos en video por partida de propuesta" : "Line-item video walkthrough proposals",
      starter: false,
      pro: true,
      business: true,
    },
    {
      feature: isEs ? "Aprobación de colores y brillos de pintura" : "Paint room-by-room color & sheen sign-offs",
      starter: false,
      pro: true,
      business: true,
    },
    {
      feature: isEs ? "Envío automatizado de propuestas y lectura" : "Automated proposal email & view tracking",
      starter: false,
      pro: true,
      business: true,
    },
    {
      feature: isEs ? "Notas de voz manos libres en el teléfono" : "Hands-free Voice-to-Estimate notes",
      starter: false,
      pro: false,
      business: true,
    },
    {
      feature: isEs ? "Recordatorios inteligentes de seguimiento a 3 y 7 días" : "Smart 3 & 7-day follow-up reminders",
      starter: false,
      pro: false,
      business: true,
    },
    {
      feature: isEs ? "Integración de prospectos de Facebook e Instagram" : "Facebook Messenger lead integration",
      starter: false,
      pro: false,
      business: true,
    },
    {
      feature: isEs ? "Usuarios incluidos" : "Included user seats",
      starter: isEs ? "1 Usuario" : "1 Seat",
      pro: isEs ? "3 Usuarios" : "3 Seats",
      business: isEs ? "5 Usuarios" : "5 Seats",
    },
    {
      feature: isEs ? "Usuarios adicionales disponibles" : "Additional paid seats supported",
      starter: "—",
      pro: "—",
      business: isEs ? "Disponible" : "Supported",
    },
  ] as const

  return (
    <div className="min-h-dvh bg-[#0B0F17] text-white selection:bg-cyan-500 selection:text-slate-950 font-sans">
      {/* Top Banner */}
      <div className="border-b border-white/10 bg-[#02182F] px-4 py-2 text-center text-xs font-medium text-slate-300">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
          <div className="inline-flex items-center gap-2">
            <span className="size-2 rounded-full bg-cyan-400 animate-pulse shrink-0" />
            <span>
              {isEs
                ? "Pintura • Paneles de Yeso • Pisos — Estimados rápidos y órdenes de trabajo bilingües en todos los planes."
                : "Painting • Drywall • Flooring — Fast mobile estimating and bilingual crew sheets on all plans."}
            </span>
          </div>

          {/* Persistent English / Español Switcher in Top Bar */}
          <div className="flex items-center gap-1 rounded-full border border-white/20 bg-slate-900/80 px-2 py-0.5 text-[11px] shrink-0">
            <Languages className="size-3 text-cyan-300 mr-1" />
            <button
              type="button"
              onClick={() => setLanguage("en")}
              className={`rounded-full px-2 py-0.5 font-bold transition-colors ${
                !isEs ? "bg-cyan-400 text-slate-950 shadow-xs" : "text-slate-300 hover:text-white"
              }`}
              aria-label="Switch to English"
            >
              EN
            </button>
            <span className="text-white/20">|</span>
            <button
              type="button"
              onClick={() => setLanguage("es")}
              className={`rounded-full px-2 py-0.5 font-bold transition-colors ${
                isEs ? "bg-cyan-400 text-slate-950 shadow-xs" : "text-slate-300 hover:text-white"
              }`}
              aria-label="Cambiar a Español"
            >
              ES
            </button>
          </div>
        </div>
      </div>

      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#02182F]/95 backdrop-blur-md">
        <div className="mx-auto flex min-h-16 max-w-6xl items-center justify-between gap-4 px-4 py-2 md:px-6">
          <div className="flex items-center gap-3">
            <BrandLogo href="/" compact />
          </div>

          <nav className="hidden items-center gap-6 text-sm font-medium text-slate-300 lg:flex" aria-label="Page navigation">
            {NAV.map((item) =>
              item.href.startsWith("/") ? (
                <Link key={item.href} href={item.href} className="transition-colors hover:text-white">
                  {item.label}
                </Link>
              ) : (
                <a key={item.href} href={item.href} className="transition-colors hover:text-white">
                  {item.label}
                </a>
              ),
            )}
          </nav>

          <div className="flex items-center gap-2 sm:gap-4 shrink-0">
            {/* Header Language Toggle */}
            <div className="flex items-center rounded-full border border-white/15 bg-white/5 p-0.5 text-xs">
              <button
                type="button"
                onClick={() => setLanguage("en")}
                className={`rounded-full px-2 py-0.5 sm:px-2.5 sm:py-1 font-bold text-[11px] sm:text-xs transition-colors ${
                  !isEs ? "bg-cyan-400 text-slate-950" : "text-slate-300 hover:text-white"
                }`}
              >
                EN
              </button>
              <button
                type="button"
                onClick={() => setLanguage("es")}
                className={`rounded-full px-2 py-0.5 sm:px-2.5 sm:py-1 font-bold text-[11px] sm:text-xs transition-colors ${
                  isEs ? "bg-cyan-400 text-slate-950" : "text-slate-300 hover:text-white"
                }`}
              >
                ES
              </button>
            </div>

            <Link
              href="/login"
              className="text-xs sm:text-sm font-semibold text-slate-300 transition-colors hover:text-white shrink-0"
            >
              {isEs ? "Entrar" : "Sign In"}
            </Link>
            <Link
              href="/signup"
              className="inline-flex items-center gap-1 rounded-full bg-cyan-400 px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-bold text-slate-950 shadow-md transition-all hover:bg-cyan-300 shrink-0 whitespace-nowrap"
            >
              <span>{isEs ? "Prueba Gratis" : "Free Trial"}</span>
              <ArrowRight className="size-3 sm:size-3.5" />
            </Link>
          </div>
        </div>

        {/* Mobile Navigation Bar */}
        <nav className="flex gap-4 overflow-x-auto border-t border-white/10 px-4 py-2 text-xs font-medium text-slate-300 lg:hidden" aria-label="Mobile navigation">
          {NAV.map((item) =>
            item.href.startsWith("/") ? (
              <Link key={item.href} href={item.href} className="shrink-0 transition-colors hover:text-white">
                {item.label}
              </Link>
            ) : (
              <a key={item.href} href={item.href} className="shrink-0 transition-colors hover:text-white">
                {item.label}
              </a>
            ),
          )}
        </nav>
      </header>

      <main id="top">
        {/* HERO SECTION */}
        <section className="relative overflow-hidden px-4 pt-10 pb-16 md:px-6 md:pt-16 md:pb-24">
          {/* Cyan Glow */}
          <div
            className="pointer-events-none absolute inset-x-0 top-0 h-[40rem] bg-[radial-gradient(ellipse_at_top,rgba(0,229,255,0.20),transparent_60%)]"
            aria-hidden="true"
          />

          <div className="relative mx-auto max-w-6xl">
            <div className="grid items-center gap-12 lg:grid-cols-12 lg:gap-8">
              {/* Left Column: Headlines & Actions */}
              <div className="lg:col-span-7">
                <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3.5 py-1.5 text-xs font-semibold text-slate-200 backdrop-blur-md">
                  <span className="size-2 rounded-full bg-cyan-400" />
                  <span>
                    {isEs
                      ? "Pintura • Paneles de Yeso • Pisos"
                      : "Painting • Drywall • Flooring Contractors"}
                  </span>
                  <span className="text-white/20">•</span>
                  <span className="text-cyan-300 font-bold">
                    {isEs ? "Desde $29/mes" : "From $29/mo"}
                  </span>
                </div>

                {/* EXACT HERO HEADLINE */}
                <h1 className="mt-6 text-4xl font-extrabold tracking-tight text-white sm:text-5xl md:text-6xl lg:leading-[1.14]">
                  {isEs ? (
                    <>
                      Estimados de pintura, <br />
                      <span className="text-cyan-400 underline decoration-cyan-400/40 decoration-4 underline-offset-6">
                        paneles de yeso y pisos.
                      </span>
                    </>
                  ) : (
                    <>
                      Estimates for painting, <br />
                      <span className="text-cyan-400 underline decoration-cyan-400/40 decoration-4 underline-offset-6">
                        drywall, and flooring.
                      </span>
                    </>
                  )}
                </h1>

                {/* EXACT HERO SUBHEADING */}
                <p className="mt-6 max-w-xl text-lg leading-relaxed text-slate-300 sm:text-xl">
                  {isEs
                    ? "Mide espacios, prepara estimados, envía propuestas para firma y comparte órdenes de trabajo con tu equipo en inglés o español."
                    : "Measure rooms, build estimates, send proposals for signature, and share work orders with your crew in English or Spanish."}
                </p>

                {/* Live benefit badges */}
                <div className="mt-6 grid max-w-lg grid-cols-1 gap-2.5 sm:grid-cols-2 text-xs font-medium text-slate-200">
                  <div className="flex items-center gap-2 rounded-lg bg-white/5 border border-white/10 p-2.5 backdrop-blur-xs">
                    <CheckCircle2 className="size-4 text-cyan-400 shrink-0" />
                    <span>{isEs ? "Croquis, notas y fotos marcadas" : "Sketch & Notes + photo markup"}</span>
                  </div>
                  <div className="flex items-center gap-2 rounded-lg bg-white/5 border border-white/10 p-2.5 backdrop-blur-xs">
                    <CheckCircle2 className="size-4 text-cyan-400 shrink-0" />
                    <span>{isEs ? "Órdenes de trabajo en inglés o español" : "Bilingual crew work orders"}</span>
                  </div>
                  <div className="flex items-center gap-2 rounded-lg bg-white/5 border border-white/10 p-2.5 backdrop-blur-xs">
                    <CheckCircle2 className="size-4 text-cyan-400 shrink-0" />
                    <span>{isEs ? "Listas de materiales sin precios" : "Price-free material buy lists"}</span>
                  </div>
                  <div className="flex items-center gap-2 rounded-lg bg-white/5 border border-white/10 p-2.5 backdrop-blur-xs">
                    <CheckCircle2 className="size-4 text-cyan-400 shrink-0" />
                    <span>{isEs ? "Lijado de pisos y despegue de láminas" : "Hardwood refinishing & drywall takeoff"}</span>
                  </div>
                </div>

                {/* Hero CTAs */}
                <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
                  <Link
                    href="/signup"
                    className="inline-flex items-center justify-center gap-2 rounded-full bg-cyan-400 px-6 py-3.5 text-base font-bold text-slate-950 shadow-[0_0_35px_rgba(0,229,255,0.40)] transition-all hover:bg-cyan-300"
                  >
                    <span>{isEs ? "Comenzar Prueba Gratis de 14 Días" : "Start 14-Day Free Trial"}</span>
                    <ArrowRight className="size-4" />
                  </Link>
                  <a
                    href="#proposal-demo"
                    className="inline-flex items-center justify-center gap-2 rounded-full border border-white/15 bg-white/5 px-6 py-3.5 text-base font-semibold text-white backdrop-blur-md transition-colors hover:bg-white/10"
                  >
                    <Play className="size-4 text-cyan-300 fill-cyan-300" />
                    <span>{isEs ? "Ver Propuesta de Muestra" : "View Sample Proposal"}</span>
                  </a>
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-slate-400">
                  <span className="flex items-center gap-1.5">
                    <Check className="size-3.5 text-emerald-400" /> {isEs ? "Prueba gratis de 14 días" : "14-day free trial"}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Check className="size-3.5 text-emerald-400" /> {isEs ? "Sin tarjeta de crédito" : "No credit card required"}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Check className="size-3.5 text-emerald-400" /> {isEs ? "Configuración al instante" : "Instant setup"}
                  </span>
                </div>
              </div>

              {/* Right Column: Multi-Trade Phone Preview */}
              <div id="phone-estimator" className="relative lg:col-span-5 flex justify-center">
                {/* Floating pill 1: Trade Selector Top Indicator */}
                <div className="hidden sm:flex absolute -top-4 -left-4 sm:-left-8 z-20 items-center gap-2.5 rounded-2xl border border-white/15 bg-slate-950/90 px-3.5 py-2 shadow-xl backdrop-blur-md">
                  <div className="flex size-7 items-center justify-center rounded-xl bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                    <Pencil className="size-4" />
                  </div>
                  <div>
                    <p className="text-[11px] font-bold text-white leading-none">
                      {isEs ? "Croquis y Fotos" : "Sketch & Notes"}
                    </p>
                    <p className="text-[10px] text-cyan-300 mt-0.5">
                      {isEs ? "Medidas y marcas en obra" : "Photo markup & dimensions"}
                    </p>
                  </div>
                </div>

                {/* Floating pill 2: Proposal Ready Indicator */}
                <div className="hidden sm:flex absolute -bottom-4 -right-4 sm:-right-6 z-20 items-center gap-2.5 rounded-2xl border border-white/15 bg-slate-950/90 px-3.5 py-2 shadow-xl backdrop-blur-md">
                  <div className="flex size-7 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    <BellRing className="size-4" />
                  </div>
                  <div>
                    <p className="text-[11px] font-bold text-white leading-none">
                      {isEs ? "Órdenes Bilingües" : "Bilingual Crew Sheet"}
                    </p>
                    <p className="text-[10px] text-emerald-300 font-semibold mt-0.5">
                      {isEs ? "Inglés / Español listo" : "English / Spanish ready"}
                    </p>
                  </div>
                </div>

                {/* Smartphone Device Frame */}
                <div className="relative w-full max-w-[340px] sm:max-w-[360px] rounded-[2.8rem] bg-slate-950 p-3 shadow-2xl ring-1 ring-white/15 shadow-cyan-500/10 border border-white/10">
                  {/* Dynamic Island Pill */}
                  <div className="absolute top-4 left-1/2 -translate-x-1/2 h-4 w-28 rounded-full bg-slate-900 z-30" />

                  {/* Inner Screen */}
                  <div className="overflow-hidden rounded-[2.2rem] bg-[#0A1222] border border-white/10 text-white">
                    {/* Status Bar */}
                    <div className="flex items-center justify-between px-6 pt-3 pb-1 text-[11px] font-semibold text-slate-400">
                      <span>9:41</span>
                      <div className="flex items-center gap-1.5">
                        <span className="size-2 rounded-full bg-cyan-400" />
                        <span>5G</span>
                      </div>
                    </div>

                    {/* App Trade Switcher Tabs Inside Phone */}
                    <div className="bg-[#02182F] px-3 pt-2 pb-1 border-b border-white/10">
                      <div className="grid grid-cols-3 gap-1 rounded-lg bg-black/40 p-1 text-[11px] font-semibold">
                        <button
                          type="button"
                          onClick={() => setActiveTrade("painting")}
                          className={`rounded py-1 text-center transition-all ${
                            activeTrade === "painting"
                              ? "bg-cyan-400 text-slate-950 font-bold"
                              : "text-slate-300 hover:text-white"
                          }`}
                        >
                          {isEs ? "Pintura" : "Painting"}
                        </button>
                        <button
                          type="button"
                          onClick={() => setActiveTrade("drywall")}
                          className={`rounded py-1 text-center transition-all ${
                            activeTrade === "drywall"
                              ? "bg-cyan-400 text-slate-950 font-bold"
                              : "text-slate-300 hover:text-white"
                          }`}
                        >
                          {isEs ? "Yeso" : "Drywall"}
                        </button>
                        <button
                          type="button"
                          onClick={() => setActiveTrade("flooring")}
                          className={`rounded py-1 text-center transition-all ${
                            activeTrade === "flooring"
                              ? "bg-cyan-400 text-slate-950 font-bold"
                              : "text-slate-300 hover:text-white"
                          }`}
                        >
                          {isEs ? "Pisos" : "Flooring"}
                        </button>
                      </div>
                    </div>

                    {/* App Header per Trade */}
                    <div className="border-b border-white/10 bg-[#061B30] px-4 py-2.5">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-[10px] font-bold tracking-wider uppercase text-cyan-400">
                            {activeTrade === "painting" && (isEs ? "Estimador de Pintura" : "Scopepipe Painting")}
                            {activeTrade === "drywall" && (isEs ? "Despegue de Paneles" : "Scopepipe Drywall")}
                            {activeTrade === "flooring" && (isEs ? "Lijado y Pisos" : "Scopepipe Flooring")}
                          </span>
                          <h4 className="text-sm font-bold text-white">
                            {activeTrade === "painting" && (isEs ? "Recámara Principal" : "Master Bedroom & Bath")}
                            {activeTrade === "drywall" && (isEs ? "Sala Principal y Pasillo" : "Great Room & Hallway")}
                            {activeTrade === "flooring" && (isEs ? "Lijado de Madera Noble" : "Oak Hardwood Refinishing")}
                          </h4>
                        </div>
                        <span className="rounded-full bg-cyan-500/15 px-2 py-0.5 text-[10px] font-semibold text-cyan-300 border border-cyan-500/30">
                          {activeTrade === "painting" && (isEs ? "Hab. 2 de 5" : "Room 2 of 5")}
                          {activeTrade === "drywall" && (isEs ? "Nivel 4 Liso" : "Level 4 Smooth")}
                          {activeTrade === "flooring" && (isEs ? "1,300 pies²" : "1,300 sq. ft.")}
                        </span>
                      </div>
                      <p className="mt-0.5 text-[11px] text-slate-400">
                        {activeTrade === "painting" && (isEs ? "16' × 14' • Techos 9 pies • 2 Manos" : "16' × 14' • 9ft Ceilings • 2 Coats")}
                        {activeTrade === "drywall" && (isEs ? "48 Láminas 4'×8' 1/2\" • 3 Pasadas" : "48 Sheets 4'×8' 1/2\" • 3 Coats Mud")}
                        {activeTrade === "flooring" && (isEs ? "Lijado, Tinte y Sellador Transparente • $8/pie²" : "Sand, Stain & Clear Coat • $8/sq. ft.")}
                      </p>
                    </div>

                    {/* Estimator Screen Body */}
                    <div className="space-y-3 p-3.5 text-xs">
                      {/* TRADE 1: PAINTING CONTENT */}
                      {activeTrade === "painting" && (
                        <>
                          <div className="rounded-xl border border-cyan-400/30 bg-cyan-950/40 p-2.5">
                            <div className="flex items-center justify-between text-[11px] font-semibold text-cyan-300">
                              <span className="flex items-center gap-1.5">
                                <Pencil className="size-3.5 text-cyan-400" />
                                {isEs ? "Croquis y Foto Marcada" : "Room Sketch & Photo Markup"}
                              </span>
                              <span className="text-[10px] text-cyan-400">{isEs ? "Guardado" : "Saved"}</span>
                            </div>
                            <p className="mt-1 text-[11px] leading-relaxed text-slate-200 italic">
                              {isEs
                                ? "«Paredes: SW Repose Gray satinado. Molduras: Extra White semibrillante.»"
                                : "“Drywall patch marked near closet. SW Repose Gray satin on walls, Extra White on trim.”"}
                            </p>
                          </div>

                          <div className="rounded-xl border border-white/10 bg-white/5 p-2.5 space-y-2">
                            <div className="flex items-center justify-between pb-1.5 border-b border-white/10 font-semibold text-[11px] text-slate-400">
                              <span>{isEs ? "Superficie" : "Surface"}</span>
                              <span>{isEs ? "Cantidad" : "Quantity"}</span>
                              <span>{isEs ? "Galones" : "Gallons"}</span>
                            </div>
                            <div className="flex items-center justify-between text-[11px]">
                              <div>
                                <p className="font-semibold text-white">{isEs ? "Paredes (Yeso)" : "Walls (Drywall)"}</p>
                                <p className="text-[10px] text-slate-400">{isEs ? "2 manos • SW Repose Gray" : "2 coats • SW Repose Gray"}</p>
                              </div>
                              <span className="text-slate-300">{isEs ? "540 pies²" : "540 sq ft"}</span>
                              <span className="font-bold text-cyan-300">3.6 gal</span>
                            </div>
                            <div className="flex items-center justify-between text-[11px]">
                              <div>
                                <p className="font-semibold text-white">{isEs ? "Molduras y Puertas" : "Baseboards & Doors"}</p>
                                <p className="text-[10px] text-slate-400">{isEs ? "Semibrillante • 2 puertas" : "Semi-gloss • 2 doors"}</p>
                              </div>
                              <span className="text-slate-300">{isEs ? "76 pies lin." : "76 lin ft"}</span>
                              <span className="font-bold text-cyan-300">1.2 gal</span>
                            </div>
                          </div>

                          {/* Paint Buy List Summary */}
                          <div className="rounded-xl bg-[#02182F] border border-cyan-400/20 p-2.5 text-white">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-slate-300">{isEs ? "Total de Partida:" : "Room Estimate Total:"}</span>
                              <span className="text-sm font-bold text-cyan-400">$1,480.00</span>
                            </div>
                            <div className="mt-1 flex items-center justify-between text-[11px] text-slate-400 border-t border-white/10 pt-1.5">
                              <span>{isEs ? "Lista de Compra Sherwin-Williams:" : "Paint Store Buy List:"}</span>
                              <span className="font-semibold text-cyan-200">{isEs ? "5 Gal (Botes enteros)" : "5 Gal (Whole Cans)"}</span>
                            </div>
                          </div>
                        </>
                      )}

                      {/* TRADE 2: DRYWALL CONTENT */}
                      {activeTrade === "drywall" && (
                        <>
                          <div className="rounded-xl border border-cyan-400/30 bg-cyan-950/40 p-2.5">
                            <div className="flex items-center justify-between text-[11px] font-semibold text-cyan-300">
                              <span className="flex items-center gap-1.5">
                                <Layers className="size-3.5 text-cyan-400" />
                                {isEs ? "Despegue de Paneles de Yeso" : "Drywall Sheet & Mud Takeoff"}
                              </span>
                              <span className="text-[10px] text-cyan-400">{isEs ? "Calculado" : "Ready"}</span>
                            </div>
                            <p className="mt-1 text-[11px] leading-relaxed text-slate-200">
                              {isEs
                                ? "48 láminas 4'×8' 1/2\". Acabado Nivel 4 listo para pintura. Cubetas de compuesto y cinta calculadas."
                                : "48 sheets 4'×8' 1/2\". Level 4 smooth finish ready for paint prime. Joint compound & tape auto-tallied."}
                            </p>
                          </div>

                          <div className="rounded-xl border border-white/10 bg-white/5 p-2.5 space-y-2">
                            <div className="flex items-center justify-between pb-1.5 border-b border-white/10 font-semibold text-[11px] text-slate-400">
                              <span>{isEs ? "Material / Tarea" : "Material / Task"}</span>
                              <span>{isEs ? "Cantidad" : "Takeoff"}</span>
                              <span>{isEs ? "Total" : "Total"}</span>
                            </div>
                            <div className="flex items-center justify-between text-[11px]">
                              <div>
                                <p className="font-semibold text-white">{isEs ? "Láminas de Yeso (4×8)" : "Drywall Sheets (4×8)"}</p>
                                <p className="text-[10px] text-slate-400">1/2&quot; standard gypsum</p>
                              </div>
                              <span className="text-slate-300">48 {isEs ? "láminas" : "sheets"}</span>
                              <span className="font-bold text-cyan-300">$3,600.00</span>
                            </div>
                            <div className="flex items-center justify-between text-[11px]">
                              <div>
                                <p className="font-semibold text-white">{isEs ? "Compuesto para Juntas" : "Joint Compound"}</p>
                                <p className="text-[10px] text-slate-400">4.5 gal all-purpose</p>
                              </div>
                              <span className="text-slate-300">6 {isEs ? "cubetas" : "buckets"}</span>
                              <span className="font-semibold text-emerald-300">{isEs ? "Incluido" : "Included"}</span>
                            </div>
                          </div>

                          <div className="rounded-xl bg-[#02182F] border border-cyan-400/20 p-2.5 text-white">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-slate-300">{isEs ? "Tarifa Colgado y Acabado:" : "Hang & Tape Rate:"}</span>
                              <span className="text-sm font-bold text-cyan-400">$75.00 / {isEs ? "lámina" : "sheet"}</span>
                            </div>
                            <div className="mt-1 flex items-center justify-between text-[11px] text-slate-400 border-t border-white/10 pt-1.5">
                              <span>{isEs ? "Lista de Compra de Material:" : "Material Buy List:"}</span>
                              <span className="font-semibold text-cyan-200">{isEs ? "48 Láminas + 6 Cubetas" : "48 Boards + 6 Buckets Mud"}</span>
                            </div>
                          </div>
                        </>
                      )}

                      {/* TRADE 3: FLOORING CONTENT */}
                      {activeTrade === "flooring" && (
                        <>
                          <div className="rounded-xl border border-cyan-400/30 bg-cyan-950/40 p-2.5">
                            <div className="flex items-center justify-between text-[11px] font-semibold text-cyan-300">
                              <span className="flex items-center gap-1.5">
                                <Wrench className="size-3.5 text-cyan-400" />
                                {isEs ? "Lijado y Barnizado de Madera" : "Hardwood Refinishing"}
                              </span>
                              <span className="text-[10px] text-cyan-400">{isEs ? "Verificado" : "Verified"}</span>
                            </div>
                            <p className="mt-1 text-[11px] leading-relaxed text-slate-200">
                              {isEs
                                ? "Lijado, Tinte y Sellador Transparente en 1,300 pies² a $8.00/pie². Sin margen duplicado."
                                : "Sand, Stain & Clear Coat: 1,300 sq. ft. @ $8.00/sq. ft. net area with stairs and repair add-ons."}
                            </p>
                          </div>

                          <div className="rounded-xl border border-white/10 bg-white/5 p-2.5 space-y-2">
                            <div className="flex items-center justify-between pb-1.5 border-b border-white/10 font-semibold text-[11px] text-slate-400">
                              <span>{isEs ? "Servicio / Partida" : "Service / Scope"}</span>
                              <span>{isEs ? "Área / Tarifa" : "Area / Rate"}</span>
                              <span>{isEs ? "Subtotal" : "Subtotal"}</span>
                            </div>
                            <div className="flex items-center justify-between text-[11px]">
                              <div>
                                <p className="font-semibold text-white">{isEs ? "Lijado, Tinte y Sellador" : "Sand, Stain & Clear"}</p>
                                <p className="text-[10px] text-slate-400">{isEs ? "Roble Sala y Comedor" : "Oak Living & Dining"}</p>
                              </div>
                              <span className="text-slate-300">{isEs ? "1,300 pies²" : "1,300 sq ft"}</span>
                              <span className="font-bold text-cyan-300">$10,400.00</span>
                            </div>
                            <div className="flex items-center justify-between text-[11px]">
                              <div>
                                <p className="font-semibold text-white">{isEs ? "Tarifa Final de Venta" : "Selling Price Rate"}</p>
                                <p className="text-[10px] text-slate-400">{isEs ? "Margen y costos incluidos" : "Includes labor & supplies"}</p>
                              </div>
                              <span className="text-slate-300">{isEs ? "$8.00 / pie²" : "$8.00 / sq ft"}</span>
                              <span className="font-semibold text-emerald-300">{isEs ? "Fijado" : "Locked"}</span>
                            </div>
                          </div>

                          <div className="rounded-xl bg-[#02182F] border border-cyan-400/20 p-2.5 text-white">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-slate-300">{isEs ? "Total de Propuesta:" : "Flooring Proposal Total:"}</span>
                              <span className="text-sm font-bold text-cyan-400">$10,400.00</span>
                            </div>
                            <div className="mt-1 flex items-center justify-between text-[11px] text-slate-400 border-t border-white/10 pt-1.5">
                              <span>{isEs ? "Opciones Extra Disponibles:" : "Optional Add-ons Available:"}</span>
                              <span className="font-semibold text-cyan-200">{isEs ? "Escalones y Reparaciones" : "Stairs & Subfloor Repairs"}</span>
                            </div>
                          </div>
                        </>
                      )}

                      {/* Phone Action Button */}
                      <a
                        href="#proposal-demo"
                        className="block w-full rounded-xl bg-cyan-400 py-2.5 text-center text-xs font-bold text-slate-950 shadow-md hover:bg-cyan-300 transition-colors"
                      >
                        {isEs ? "Ver Propuesta para el Cliente →" : "View Customer Proposal →"}
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* THREE EQUALLY PROMINENT SECTIONS DIRECTLY BELOW HERO FOR PAINTING, DRYWALL & FLOORING */}
        <section id="trades" className="scroll-mt-24 border-t border-white/10 bg-[#070D18] px-4 py-20 md:px-6">
          <div className="mx-auto max-w-6xl">
            <div className="text-center max-w-2xl mx-auto">
              <span className="rounded-full bg-cyan-500/15 border border-cyan-400/30 px-3.5 py-1 text-xs font-bold text-cyan-300 uppercase tracking-wide">
                {isEs ? "Tres Oficios Principales" : "Three Core Trades"}
              </span>
              <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
                {isEs
                  ? "Especializado para Pintura, Paneles de Yeso y Pisos"
                  : "Purpose-Built for Painting, Drywall & Flooring"}
              </h2>
              <p className="mt-3 text-sm text-slate-300">
                {isEs
                  ? "Cada oficio tiene sus propios despegues, materiales y tarifas. Conoce ejemplos reales de presupuestos y herramientas verificadas en cada especialidad."
                  : "Each trade has its own formulas, materials, and pricing. Explore real verified job examples and field-tested estimator tools for each specialty."}
              </p>
            </div>

            {/* Equal 3 Trade Sections Grid */}
            <div className="mt-14 grid gap-8 lg:grid-cols-3 items-stretch">
              {/* TRADE SECTION 1: PAINTING */}
              <div
                className={`relative flex flex-col justify-between rounded-3xl border p-7 transition-all ${
                  activeTrade === "painting"
                    ? "border-cyan-400 bg-gradient-to-b from-[#0F223D] to-[#0A1629] shadow-2xl shadow-cyan-500/15 ring-1 ring-cyan-400/40"
                    : "border-white/10 bg-white/5 hover:border-cyan-400/40 hover:bg-white/[0.08]"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <div className="flex size-12 items-center justify-center rounded-2xl bg-cyan-500/20 text-cyan-300 border border-cyan-400/30">
                      <Paintbrush className="size-6" />
                    </div>
                    <span className="rounded-full bg-cyan-950/60 border border-cyan-500/30 px-3 py-1 text-[11px] font-bold text-cyan-300 uppercase">
                      {isEs ? "Pintura Interior y Exterior" : "Interior & Exterior Paint"}
                    </span>
                  </div>

                  <h3 className="mt-5 text-2xl font-bold text-white">
                    {isEs ? "Pintura" : "Painting"}
                  </h3>
                  <p className="mt-2 text-xs leading-relaxed text-slate-300">
                    {isEs
                      ? "Mide habitaciones y desglosa paredes, techos, puertas y molduras. Genera listas de compra de galones completos y fija colores exactos con el cliente."
                      : "Measure rooms and itemize walls, ceilings, doors, and trim on-site. Generate whole-can store buy lists and lock exact color codes before the first brushstroke."}
                  </p>

                  {/* Verified Job Example Box */}
                  <div className="mt-6 rounded-2xl border border-white/15 bg-black/40 p-4">
                    <p className="text-[10px] font-bold tracking-wider uppercase text-cyan-400">
                      {isEs ? "Ejemplo Real de Trabajo" : "Verified Job Example"}
                    </p>
                    <h4 className="mt-1 text-sm font-bold text-white">
                      {isEs ? "Recámara Principal y Baño" : "Master Bedroom & Bath"}
                    </h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {isEs ? "16' × 14' • Techos 9 pies • 2 Manos" : "16' × 14' • 9ft Ceilings • 2 Coats"}
                    </p>

                    <div className="mt-3 space-y-1.5 border-t border-white/10 pt-2 text-xs">
                      <div className="flex justify-between text-slate-300">
                        <span>{isEs ? "Paredes (SW Repose Gray):" : "Walls (SW Repose Gray):"}</span>
                        <span className="font-semibold text-white">{isEs ? "540 pies² (3.6 gal)" : "540 sq ft (3.6 gal)"}</span>
                      </div>
                      <div className="flex justify-between text-slate-300">
                        <span>{isEs ? "Molduras y 2 Puertas:" : "Trim & 2 Doors:"}</span>
                        <span className="font-semibold text-white">{isEs ? "76 pies lin. (1.2 gal)" : "76 lin ft (1.2 gal)"}</span>
                      </div>
                      <div className="flex justify-between text-slate-300">
                        <span>{isEs ? "Techos blancos planos:" : "Flat white ceilings:"}</span>
                        <span className="font-semibold text-white">{isEs ? "224 pies² (1.4 gal)" : "224 sq ft (1.4 gal)"}</span>
                      </div>
                      <div className="flex justify-between text-cyan-300 border-t border-white/10 pt-1.5 font-bold">
                        <span>{isEs ? "Lista de compra en tienda:" : "Store buy list (whole cans):"}</span>
                        <span>{isEs ? "5 Galones" : "5 Gallons"}</span>
                      </div>
                      <div className="flex justify-between text-white border-t border-white/10 pt-1.5 text-sm font-extrabold">
                        <span>{isEs ? "Total de la partida:" : "Room Estimate Total:"}</span>
                        <span className="text-cyan-400">$1,480.00</span>
                      </div>
                    </div>
                  </div>

                  {/* Verified Estimator Features */}
                  <div className="mt-6">
                    <p className="text-xs font-bold text-white uppercase tracking-wider">
                      {isEs ? "Funciones Verificadas:" : "Verified Estimator Features:"}
                    </p>
                    <ul className="mt-3 space-y-2 text-xs text-slate-300">
                      <li className="flex items-center gap-2">
                        <Check className="size-4 text-cyan-400 shrink-0" />
                        <span>{isEs ? "Desglose por habitación y superficie" : "Room-by-room surface takeoff & deductions"}</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="size-4 text-cyan-400 shrink-0" />
                        <span>{isEs ? "Listas de compra Sherwin/Benjamin Moore (botes enteros)" : "Store buy lists (whole cans, Sherwin/Benjamin Moore)"}</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="size-4 text-cyan-400 shrink-0" />
                        <span>{isEs ? "Aprobación de colores y brillos con firma" : "Room-by-room color & sheen sign-offs"}</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="size-4 text-cyan-400 shrink-0" />
                        <span>{isEs ? "Órdenes de preparación en inglés y español" : "Bilingual prep & paint crew work orders"}</span>
                      </li>
                    </ul>
                  </div>
                </div>

                <div className="mt-8 pt-4 border-t border-white/10">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTrade("painting")
                      document.getElementById("phone-estimator")?.scrollIntoView({ behavior: "smooth" })
                    }}
                    className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-white/10 py-2.5 text-xs font-bold text-cyan-300 hover:bg-white/20 transition-colors"
                  >
                    <span>{isEs ? "Ver Estimador de Pintura en el Teléfono ↑" : "Preview Painting on Phone ↑"}</span>
                    <ArrowRight className="size-3.5" />
                  </button>
                </div>
              </div>

              {/* TRADE SECTION 2: DRYWALL */}
              <div
                className={`relative flex flex-col justify-between rounded-3xl border p-7 transition-all ${
                  activeTrade === "drywall"
                    ? "border-cyan-400 bg-gradient-to-b from-[#0F223D] to-[#0A1629] shadow-2xl shadow-cyan-500/15 ring-1 ring-cyan-400/40"
                    : "border-white/10 bg-white/5 hover:border-cyan-400/40 hover:bg-white/[0.08]"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <div className="flex size-12 items-center justify-center rounded-2xl bg-cyan-500/20 text-cyan-300 border border-cyan-400/30">
                      <Layers className="size-6" />
                    </div>
                    <span className="rounded-full bg-cyan-950/60 border border-cyan-500/30 px-3 py-1 text-[11px] font-bold text-cyan-300 uppercase">
                      {isEs ? "Colgado y Acabado" : "Hang, Tape & Finish"}
                    </span>
                  </div>

                  <h3 className="mt-5 text-2xl font-bold text-white">
                    {isEs ? "Paneles de Yeso" : "Drywall"}
                  </h3>
                  <p className="mt-2 text-xs leading-relaxed text-slate-300">
                    {isEs
                      ? "Calcula láminas de 4x8, 4x12 o 5/8\" contra fuego por habitación. Especifica acabados Nivel 1 a 5 con cálculo de cubetas de compuesto y tornillos."
                      : "Calculate 4x8, 4x12, and 5/8\" firecode board counts per room. Specify finish levels 1 to 5 with automatic joint compound buckets and fastener takeoffs."}
                  </p>

                  {/* Verified Job Example Box */}
                  <div className="mt-6 rounded-2xl border border-white/15 bg-black/40 p-4">
                    <p className="text-[10px] font-bold tracking-wider uppercase text-cyan-400">
                      {isEs ? "Ejemplo Real de Trabajo" : "Verified Job Example"}
                    </p>
                    <h4 className="mt-1 text-sm font-bold text-white">
                      {isEs ? "Sala Principal y Pasillo" : "Great Room & Hallway"}
                    </h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {isEs ? "48 Láminas 4'×8' 1/2\" • Acabado Nivel 4 Liso" : "48 Sheets 4'×8' 1/2\" • Level 4 Smooth Finish"}
                    </p>

                    <div className="mt-3 space-y-1.5 border-t border-white/10 pt-2 text-xs">
                      <div className="flex justify-between text-slate-300">
                        <span>{isEs ? "Láminas de yeso (4'×8' 1/2\"):" : "Drywall sheets (4'×8' 1/2\"):"}</span>
                        <span className="font-semibold text-white">48 {isEs ? "láminas" : "sheets"}</span>
                      </div>
                      <div className="flex justify-between text-slate-300">
                        <span>{isEs ? "Compuesto para juntas (cubetas 4.5 gal):" : "Joint compound (4.5 gal buckets):"}</span>
                        <span className="font-semibold text-white">6 {isEs ? "cubetas" : "buckets"}</span>
                      </div>
                      <div className="flex justify-between text-slate-300">
                        <span>{isEs ? "Cinta de papel y tornillos 1-1/4\":" : "Paper tape & 1-1/4\" screws:"}</span>
                        <span className="font-semibold text-white">4 {isEs ? "rollos + 2 cajas" : "rolls + 2 boxes"}</span>
                      </div>
                      <div className="flex justify-between text-cyan-300 border-t border-white/10 pt-1.5 font-bold">
                        <span>{isEs ? "Tarifa colgado y acabado:" : "Hang, tape & finish unit rate:"}</span>
                        <span>$75.00 / {isEs ? "lámina" : "sheet"}</span>
                      </div>
                      <div className="flex justify-between text-white border-t border-white/10 pt-1.5 text-sm font-extrabold">
                        <span>{isEs ? "Total de la partida:" : "Drywall Scope Total:"}</span>
                        <span className="text-cyan-400">$3,600.00</span>
                      </div>
                    </div>
                  </div>

                  {/* Verified Estimator Features */}
                  <div className="mt-6">
                    <p className="text-xs font-bold text-white uppercase tracking-wider">
                      {isEs ? "Funciones Verificadas:" : "Verified Estimator Features:"}
                    </p>
                    <ul className="mt-3 space-y-2 text-xs text-slate-300">
                      <li className="flex items-center gap-2">
                        <Check className="size-4 text-cyan-400 shrink-0" />
                        <span>{isEs ? "Conteo de láminas (4×8, 4×12, 5/8\" contra fuego)" : "Board counts (4x8, 4x12, 5/8\" firecode) + waste"}</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="size-4 text-cyan-400 shrink-0" />
                        <span>{isEs ? "Niveles de acabado 1 al 5 (cinta contra fuego a liso total)" : "Finish levels 1 to 5 (fire tape to Level 5 full skim)"}</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="size-4 text-cyan-400 shrink-0" />
                        <span>{isEs ? "Cálculo automático de cubetas, cinta y tornillos" : "Joint compound bucket, tape, and screw takeoff"}</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="size-4 text-cyan-400 shrink-0" />
                        <span>{isEs ? "Órdenes de colgado y encintado en inglés o español" : "Bilingual hang & tape crew instructions"}</span>
                      </li>
                    </ul>
                  </div>
                </div>

                <div className="mt-8 pt-4 border-t border-white/10">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTrade("drywall")
                      document.getElementById("phone-estimator")?.scrollIntoView({ behavior: "smooth" })
                    }}
                    className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-white/10 py-2.5 text-xs font-bold text-cyan-300 hover:bg-white/20 transition-colors"
                  >
                    <span>{isEs ? "Ver Estimador de Yeso en el Teléfono ↑" : "Preview Drywall on Phone ↑"}</span>
                    <ArrowRight className="size-3.5" />
                  </button>
                </div>
              </div>

              {/* TRADE SECTION 3: FLOORING (WITH VERIFIED HARDWOOD REFINISHING) */}
              <div
                className={`relative flex flex-col justify-between rounded-3xl border p-7 transition-all ${
                  activeTrade === "flooring"
                    ? "border-cyan-400 bg-gradient-to-b from-[#0F223D] to-[#0A1629] shadow-2xl shadow-cyan-500/15 ring-1 ring-cyan-400/40"
                    : "border-white/10 bg-white/5 hover:border-cyan-400/40 hover:bg-white/[0.08]"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <div className="flex size-12 items-center justify-center rounded-2xl bg-cyan-500/20 text-cyan-300 border border-cyan-400/30">
                      <Wrench className="size-6" />
                    </div>
                    <span className="rounded-full bg-cyan-950/60 border border-cyan-500/30 px-3 py-1 text-[11px] font-bold text-cyan-300 uppercase">
                      {isEs ? "Lijado e Instalación" : "Refinishing & Install"}
                    </span>
                  </div>

                  <h3 className="mt-5 text-2xl font-bold text-white">
                    {isEs ? "Pisos" : "Flooring"}
                  </h3>
                  <p className="mt-2 text-xs leading-relaxed text-slate-300">
                    {isEs
                      ? "Lijado y barnizado de madera existente (Screen & Recoat, Sand & Refinish, Sand, Stain & Clear Coat) o instalación de LVP, madera y azulejos con cajas y desperdicio."
                      : "Hardwood refinishing (Screen & Recoat, Sand & Refinish, Sand, Stain & Clear Coat) plus new LVP, tile, and hardwood installation with cartons and waste factor."}
                  </p>

                  {/* Verified Job Example Box */}
                  <div className="mt-6 rounded-2xl border border-white/15 bg-black/40 p-4">
                    <p className="text-[10px] font-bold tracking-wider uppercase text-cyan-400">
                      {isEs ? "Ejemplo Real de Trabajo (En Producción)" : "Verified Job Example (Live in Release)"}
                    </p>
                    <h4 className="mt-1 text-sm font-bold text-white">
                      {isEs ? "Lijado y Barnizado de Madera Noble" : "Oak Hardwood Refinishing"}
                    </h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {isEs ? "1,300 pies² netos • Lijado, Tinte y Sellador Transparente" : "1,300 sq. ft. net • Sand, Stain & Clear Coat"}
                    </p>

                    <div className="mt-3 space-y-1.5 border-t border-white/10 pt-2 text-xs">
                      <div className="flex justify-between text-slate-300">
                        <span>{isEs ? "Tipo de trabajo:" : "Job Type:"}</span>
                        <span className="font-semibold text-white">{isEs ? "Lijado de Madera Existente" : "Refinish Existing Hardwood"}</span>
                      </div>
                      <div className="flex justify-between text-slate-300">
                        <span>{isEs ? "Servicio:" : "Service:"}</span>
                        <span className="font-semibold text-white">{isEs ? "Lijado, Tinte y Sellador" : "Sand, Stain & Clear Coat"}</span>
                      </div>
                      <div className="flex justify-between text-slate-300">
                        <span>{isEs ? "Área neta calculada:" : "Net square footage:"}</span>
                        <span className="font-semibold text-white">{isEs ? "1,300 pies²" : "1,300 sq. ft."}</span>
                      </div>
                      <div className="flex justify-between text-cyan-300 border-t border-white/10 pt-1.5 font-bold">
                        <span>{isEs ? "Precio final de venta por pie²:" : "Final Selling Price per sq. ft.:"}</span>
                        <span>{isEs ? "$8.00 / pie²" : "$8.00 / sq. ft."}</span>
                      </div>
                      <div className="flex justify-between text-white border-t border-white/10 pt-1.5 text-sm font-extrabold">
                        <span>{isEs ? "Total de la propuesta:" : "Verified Proposal Total:"}</span>
                        <span className="text-cyan-400">$10,400.00</span>
                      </div>
                    </div>
                  </div>

                  {/* Verified Estimator Features */}
                  <div className="mt-6">
                    <p className="text-xs font-bold text-white uppercase tracking-wider">
                      {isEs ? "Funciones Verificadas:" : "Verified Estimator Features:"}
                    </p>
                    <ul className="mt-3 space-y-2 text-xs text-slate-300">
                      <li className="flex items-center gap-2">
                        <Check className="size-4 text-cyan-400 shrink-0" />
                        <span>{isEs ? "Selector de trabajo: Instalar Nuevo Piso vs. Lijar Madera" : "Job Type: Install New Flooring vs. Refinish Hardwood"}</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="size-4 text-cyan-400 shrink-0" />
                        <span>{isEs ? "3 opciones de servicio (Screen & Recoat, Sand & Refinish, Sand & Stain)" : "3 refinish services (Screen & Recoat, Sand & Refinish, Sand & Stain)"}</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="size-4 text-cyan-400 shrink-0" />
                        <span>{isEs ? "Tarifa final por pie² (omite margen duplicado)" : "Final selling rate $/sq. ft. (omits duplicate markup)"}</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="size-4 text-cyan-400 shrink-0" />
                        <span>{isEs ? "Partidas adicionales para escaleras y reparaciones" : "Separately priced stairs & subfloor repair add-ons"}</span>
                      </li>
                    </ul>
                  </div>
                </div>

                <div className="mt-8 pt-4 border-t border-white/10">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTrade("flooring")
                      document.getElementById("phone-estimator")?.scrollIntoView({ behavior: "smooth" })
                    }}
                    className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-white/10 py-2.5 text-xs font-bold text-cyan-300 hover:bg-white/20 transition-colors"
                  >
                    <span>{isEs ? "Ver Estimador de Pisos en el Teléfono ↑" : "Preview Flooring on Phone ↑"}</span>
                    <ArrowRight className="size-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* SHARED WORKFLOW FEATURES GRID (MEASURE, SEND, SHARE) */}
        <section id="features" className="scroll-mt-24 border-t border-white/10 bg-[#0B0F17] px-4 py-20 md:px-6">
          <div className="mx-auto max-w-6xl">
            <div className="max-w-2xl">
              <span className="text-xs font-bold tracking-wider uppercase text-cyan-400">
                {isEs ? "Flujo de Trabajo Compartido" : "The Shared Trade Workflow"}
              </span>
              <h2 className="mt-2 text-3xl font-bold tracking-tight text-white sm:text-4xl">
                {isEs
                  ? "Mide la obra. Envía la propuesta. Comparte la orden con tu equipo."
                  : "Measure the job. Send the proposal. Share the crew work order."}
              </h2>
              <p className="mt-3 text-base text-slate-300">
                {isEs
                  ? "Pintores, yeseros e instaladores de pisos comparten el mismo reto: entregar presupuestos precisos en obra, ganar la firma del cliente y coordinar cuadrillas bilingües sin exponer sus costos."
                  : "Painters, drywallers, and flooring installers share the same critical field workflow: measure accurately on-site, win client e-signatures, and dispatch bilingual crews without exposing margins."}
              </p>
            </div>

            <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {SHARED_WORKFLOW_FEATURES.map((feat) => (
                <article
                  key={feat.title}
                  className="group relative flex flex-col justify-between rounded-2xl border border-white/10 bg-white/5 p-6 transition-all hover:border-cyan-400/60 hover:bg-white/[0.08]"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <div className="flex size-11 items-center justify-center rounded-xl bg-white/10 border border-white/10 text-cyan-300 group-hover:bg-cyan-400 group-hover:text-slate-950 transition-colors">
                        <feat.icon className="size-5" />
                      </div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400/80">
                        {feat.stage}
                      </span>
                    </div>
                    <h3 className="mt-4 text-lg font-bold text-white">{feat.title}</h3>
                    <p className="mt-1 text-xs font-semibold text-cyan-300">{feat.tagline}</p>
                    <p className="mt-2.5 text-sm leading-relaxed text-slate-300">{feat.body}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* DETAILED HIGHLIGHT: SKETCH & NOTES & BILINGUAL CREW SHEETS */}
        <section className="border-t border-white/10 bg-[#070D18] px-4 py-20 md:px-6">
          <div className="mx-auto max-w-6xl">
            <div className="grid items-center gap-12 lg:grid-cols-2">
              {/* Highlight 1: Sketch & Notes + Photo Markup (Measure) */}
              <div className="rounded-3xl border border-white/10 bg-white/5 p-8 shadow-xl backdrop-blur-md">
                <div className="inline-flex size-10 items-center justify-center rounded-xl bg-cyan-950/60 border border-cyan-500/30 text-cyan-300">
                  <Pencil className="size-5" />
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400">
                    {isEs ? "Medir en Obra" : "Measure the Job"}
                  </span>
                </div>
                <h3 className="mt-2 text-2xl font-bold text-white">
                  {isEs ? "Croquis y Notas: Dibuja y Marca Fotos" : "Sketch & Notes: Freehand Draw & Markup Photos"}
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-slate-300">
                  {isEs
                    ? "Incluido en todos los planes. Dibuja planos de habitaciones con tu dedo o stylus, estampa dimensiones, marca parches de yeso o toma fotos de pisos y molduras dañadas para anotar directamente sobre ellas."
                    : "Included on all plans. Draw freehand room layouts with finger or stylus, stamp room dimensions, mark repair spots, or snap a photo of damaged sheetrock or flooring and annotate directly over it on your phone."}
                </p>
                <ul className="mt-6 space-y-2.5 text-xs font-medium text-slate-200">
                  <li className="flex items-center gap-2">
                    <Check className="size-4 text-cyan-400 shrink-0" />
                    <span>{isEs ? "Dibujo táctil con lápiz, colores y borrador" : "Freehand stylus/touch drawing with pen, colors & eraser"}</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="size-4 text-cyan-400 shrink-0" />
                    <span>{isEs ? "Marcado de fotos: toma fotos de obra y dibuja sobre ellas" : "Photo markup: take jobsite pictures and draw directly over them"}</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="size-4 text-cyan-400 shrink-0" />
                    <span>{isEs ? "Notas privadas de la empresa u opcionales para la propuesta" : "Private internal note by default; optional toggle for proposal"}</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="size-4 text-cyan-400 shrink-0" />
                    <span>{isEs ? "La cuadrilla ve las instrucciones sin ver tus márgenes" : "Crew members see instructions without private pricing"}</span>
                  </li>
                </ul>
              </div>

              {/* Highlight 2: Bilingual Crew Work Orders (Share) */}
              <div className="rounded-3xl border border-white/10 bg-white/5 p-8 shadow-xl backdrop-blur-md">
                <div className="inline-flex size-10 items-center justify-center rounded-xl bg-cyan-950/60 border border-cyan-500/30 text-cyan-300">
                  <Languages className="size-5" />
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400">
                    {isEs ? "Compartir con el Equipo" : "Share with Crew"}
                  </span>
                </div>
                <h3 className="mt-2 text-2xl font-bold text-white">
                  {isEs ? "Órdenes de Trabajo en Inglés y Español" : "Bilingual Crew Sheets (English & Spanish)"}
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-slate-300">
                  {isEs
                    ? "Comunica exactamente lo que debe hacerse sin barreras de idioma. Con un solo clic, la cuadrilla abre la orden en español o inglés con listas de compra sin precios, notas de preparación y croquis."
                    : "Bridge the language barrier on the jobsite. Your crew opens the work order in English or Spanish with a single tap, viewing price-free material lists, prep specs, and marked photos while keeping profit margins private."}
                </p>
                <ul className="mt-6 space-y-2.5 text-xs font-medium text-slate-200">
                  <li className="flex items-center gap-2">
                    <Check className="size-4 text-cyan-400 shrink-0" />
                    <span>{isEs ? "Interruptor visible Inglés / Español en la orden" : "1-tap English / Spanish toggle on every work order"}</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="size-4 text-cyan-400 shrink-0" />
                    <span>{isEs ? "Listas de materiales sin precios para el equipo" : "Price-free material lists for paint, drywall, and flooring"}</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="size-4 text-cyan-400 shrink-0" />
                    <span>{isEs ? "Recordatorios inteligentes a 3 y 7 días para propuestas" : "Smart 3 & 7-day follow-up reminders to close sent bids"}</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* HOW IT WORKS: THE 3-STEP SHARED WORKFLOW */}
        <section id="how-it-works" className="scroll-mt-24 border-t border-white/10 bg-[#0B0F17] px-4 py-20 md:px-6">
          <div className="mx-auto max-w-6xl">
            <div className="text-center max-w-xl mx-auto">
              <span className="text-xs font-bold tracking-wider uppercase text-cyan-400">
                {isEs ? "El Flujo de Trabajo en 3 Pasos" : "The 3-Step Trade Workflow"}
              </span>
              <h2 className="mt-2 text-3xl font-bold tracking-tight text-white sm:text-4xl">
                {isEs ? "Cómo Funciona Scopepipe" : "How Scopepipe Works"}
              </h2>
              <p className="mt-3 text-sm text-slate-300">
                {isEs
                  ? "La misma fórmula comprobada para pintura, paneles de yeso y pisos: desde la visita con el dueño hasta el trabajo terminado."
                  : "The proven workflow for painting, drywall, and flooring contractors from first estimate to final sign-off."}
              </p>
            </div>

            <div className="mt-12 grid gap-6 md:grid-cols-3">
              {WORKFLOW_STEPS.map((item) => (
                <div key={item.step} className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-2xs">
                  <span className="text-4xl font-extrabold text-cyan-300">{item.step}</span>
                  <h3 className="mt-4 text-xl font-bold text-white">{item.title}</h3>
                  <p className="mt-2.5 text-sm leading-relaxed text-slate-300">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* SAMPLE PROPOSAL DEMO: SHARED PROPOSAL EXPERIENCE */}
        <section id="proposal-demo" className="scroll-mt-24 border-t border-white/10 bg-[#070D18]">
          <ProposalDemo lang={lang} />
        </section>

        {/* THREE SUBSCRIPTION TIERS (PRESERVED PRICING & TERMS) */}
        <section id="pricing" className="scroll-mt-24 border-t border-white/10 bg-[#0B0F17] px-4 py-20 md:px-6">
          <div className="mx-auto max-w-6xl">
            <div className="text-center max-w-2xl mx-auto">
              <span className="rounded-full bg-cyan-500/15 border border-cyan-400/30 px-3.5 py-1 text-xs font-bold text-cyan-300 uppercase tracking-wide">
                {isEs ? "Planes Transparentes" : "Transparent Plans"}
              </span>
              <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
                {isEs ? "Elige el plan ideal para tu negocio" : "Choose the plan that fits your business"}
              </h2>
              <p className="mt-3 text-sm text-slate-300">
                {isEs
                  ? "Comienza con una prueba gratis de 14 días en cualquier plan. Sin tarjeta de crédito requerida. Cambia de plan cuando quieras."
                  : "Start on any plan with a 14-day free trial. No credit card required to start. Change plans anytime."}
              </p>
            </div>

            {/* Three Pricing Cards */}
            <div className="mt-12 grid gap-6 lg:grid-cols-3 items-stretch">
              {/* Plan 1: Starter ($29) */}
              <div className="flex flex-col justify-between rounded-3xl border border-white/10 bg-white/5 p-7 transition-all hover:border-white/20">
                <div>
                  <h3 className="text-xl font-bold text-white">Starter</h3>
                  <p className="mt-1 text-xs text-slate-400">
                    {isEs
                      ? "Para contratistas independientes de pintura, paneles de yeso o pisos."
                      : "For solo painting, drywall, or flooring contractors estimating on-site."}
                  </p>
                  <div className="mt-6 flex items-baseline gap-1">
                    <span className="text-5xl font-extrabold tracking-tight text-white">$29</span>
                    <span className="text-sm font-semibold text-slate-400">{isEs ? "/mes" : "/month"}</span>
                  </div>
                  <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-slate-800 px-3 py-1 text-xs font-semibold text-slate-200 border border-white/10">
                    <Users className="size-3.5 text-cyan-400" />
                    <span>{isEs ? "1 Usuario incluido" : "1 Included user seat"}</span>
                  </div>
                  <ul className="mt-6 space-y-2.5 text-xs text-slate-300">
                    <li className="flex items-center gap-2">
                      <Check className="size-4 text-cyan-400 shrink-0" />
                      <span>{isEs ? "Estimados móviles para pintura, yeso y pisos" : "Mobile room estimating (paint, drywall, floor)"}</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="size-4 text-cyan-400 shrink-0" />
                      <span>{isEs ? "Propuestas profesionales con firma digital" : "Professional proposals & e-signatures"}</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="size-4 text-cyan-400 shrink-0" />
                      <span>{isEs ? "Listas de compra de materiales sin precios" : "Price-free material & paint buy lists"}</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="size-4 text-cyan-400 shrink-0" />
                      <span>{isEs ? "Lijado de pisos y despegue de láminas de yeso" : "Hardwood refinishing & drywall takeoff"}</span>
                    </li>
                    <li className="flex items-center gap-2 font-medium text-cyan-200">
                      <Check className="size-4 text-cyan-400 shrink-0" />
                      <span>{isEs ? "Órdenes de trabajo en inglés y español" : "English & Spanish crew work orders"}</span>
                    </li>
                    <li className="flex items-center gap-2 font-medium text-cyan-200">
                      <Check className="size-4 text-cyan-400 shrink-0" />
                      <span>{isEs ? "Croquis y notas con fotos marcadas" : "Sketch & Notes with photo markup"}</span>
                    </li>
                  </ul>
                </div>
                <div className="mt-8">
                  <Link
                    href="/signup"
                    className="block w-full rounded-full border border-white/20 bg-white/10 py-3 text-center text-sm font-semibold text-white hover:bg-white/15 transition-colors"
                  >
                    {isEs ? "Comenzar Prueba de 14 Días" : "Start 14-Day Free Trial"}
                  </Link>
                </div>
              </div>

              {/* Plan 2: Pro ($49 - MOST POPULAR) */}
              <div className="relative flex flex-col justify-between rounded-3xl border-2 border-cyan-400 bg-gradient-to-b from-[#0F223D] to-[#0A1629] p-7 shadow-2xl shadow-cyan-500/20 lg:-translate-y-2">
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-cyan-400 px-3.5 py-0.5 text-[11px] font-extrabold text-slate-950 uppercase tracking-wider shadow-md">
                  {isEs ? "Más Popular" : "Most Popular"}
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white flex items-center justify-between">
                    <span>Pro</span>
                    <Sparkles className="size-5 text-cyan-300" />
                  </h3>
                  <p className="mt-1 text-xs text-slate-300">
                    {isEs
                      ? "Para negocios de pintura, yeso y pisos que venden presupuestos con video y despachan cuadrillas."
                      : "For growing painting, drywall, and flooring teams selling bids & scheduling crews."}
                  </p>
                  <div className="mt-6 flex items-baseline gap-1">
                    <span className="text-5xl font-extrabold tracking-tight text-white">$49</span>
                    <span className="text-sm font-semibold text-slate-400">{isEs ? "/mes" : "/month"}</span>
                  </div>
                  <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-cyan-500/20 px-3 py-1 text-xs font-bold text-cyan-300 border border-cyan-400/40">
                    <Users className="size-3.5 text-cyan-300" />
                    <span>{isEs ? "3 Usuarios incluidos" : "3 Included user seats"}</span>
                  </div>
                  <ul className="mt-6 space-y-2.5 text-xs text-slate-200">
                    <li className="flex items-center gap-2 font-semibold text-white">
                      <Check className="size-4 text-cyan-400 shrink-0" />
                      <span>{isEs ? "Todo lo incluido en Starter" : "Everything in Starter"}</span>
                    </li>
                    <li className="flex items-center gap-2 font-medium text-cyan-200">
                      <Check className="size-4 text-cyan-400 shrink-0" />
                      <span>{isEs ? "3 Usuarios de equipo incluidos" : "3 Included team seats"}</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="size-4 text-cyan-400 shrink-0" />
                      <span>{isEs ? "Propuestas con recorridos en video por partida" : "Line-item video walkthrough proposals"}</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="size-4 text-cyan-400 shrink-0" />
                      <span>{isEs ? "Aprobación de colores, brillos y acabados" : "Material, color & sheen customer sign-offs"}</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="size-4 text-cyan-400 shrink-0" />
                      <span>{isEs ? "Envío automatizado y seguimiento de lectura" : "Automated proposal email & view tracking"}</span>
                    </li>
                    <li className="flex items-center gap-2 font-medium text-cyan-200">
                      <Check className="size-4 text-cyan-400 shrink-0" />
                      <span>{isEs ? "Croquis y órdenes bilingües en obra" : "Sketch & Notes + Spanish work orders"}</span>
                    </li>
                  </ul>
                </div>
                <div className="mt-8">
                  <Link
                    href="/signup"
                    className="block w-full rounded-full bg-cyan-400 py-3.5 text-center text-sm font-bold text-slate-950 shadow-[0_0_30px_rgba(0,229,255,0.40)] hover:bg-cyan-300 transition-all"
                  >
                    {isEs ? "Comenzar Prueba de 14 Días" : "Start 14-Day Free Trial"}
                  </Link>
                </div>
              </div>

              {/* Plan 3: Business ($79) */}
              <div className="flex flex-col justify-between rounded-3xl border border-white/10 bg-white/5 p-7 transition-all hover:border-white/20">
                <div>
                  <h3 className="text-xl font-bold text-white">Business</h3>
                  <p className="mt-1 text-xs text-slate-400">
                    {isEs
                      ? "Para empresas establecidas de pintura, yeso y pisos que escalan volumen y operaciones."
                      : "For established painting, drywall, and flooring contractors scaling volume & crew operations."}
                  </p>
                  <div className="mt-6 flex items-baseline gap-1">
                    <span className="text-5xl font-extrabold tracking-tight text-white">$79</span>
                    <span className="text-sm font-semibold text-slate-400">{isEs ? "/mes" : "/month"}</span>
                  </div>
                  <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-slate-800 px-3 py-1 text-xs font-semibold text-slate-200 border border-white/10">
                    <Users className="size-3.5 text-cyan-400" />
                    <span>{isEs ? "5 Usuarios incluidos (+ usuarios extra)" : "5 Included seats (+ additional seats supported)"}</span>
                  </div>
                  <ul className="mt-6 space-y-2.5 text-xs text-slate-300">
                    <li className="flex items-center gap-2 font-semibold text-white">
                      <Check className="size-4 text-cyan-400 shrink-0" />
                      <span>{isEs ? "Todo lo incluido en Pro" : "Everything in Pro"}</span>
                    </li>
                    <li className="flex items-center gap-2 font-medium text-cyan-200">
                      <Check className="size-4 text-cyan-400 shrink-0" />
                      <span>{isEs ? "5 Asientos + compra de usuarios adicionales" : "5 Included seats + purchase extra seats"}</span>
                    </li>
                    <li className="flex items-center gap-2 font-medium text-cyan-200">
                      <Check className="size-4 text-cyan-400 shrink-0" />
                      <span>{isEs ? "Notas por voz manos libres en el teléfono" : "Hands-free Voice-to-Estimate notes"}</span>
                    </li>
                    <li className="flex items-center gap-2 font-medium text-cyan-200">
                      <Check className="size-4 text-cyan-400 shrink-0" />
                      <span>{isEs ? "Recordatorios inteligentes a 3 y 7 días" : "Smart 3 & 7-day follow-up reminders"}</span>
                    </li>
                    <li className="flex items-center gap-2 font-medium text-cyan-200">
                      <Check className="size-4 text-cyan-400 shrink-0" />
                      <span>{isEs ? "Prospectos directos de Facebook e Instagram" : "Facebook & Instagram Messenger leads"}</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="size-4 text-cyan-400 shrink-0" />
                      <span>{isEs ? "Soporte prioritario para contratistas" : "Priority contractor support"}</span>
                    </li>
                  </ul>
                </div>
                <div className="mt-8">
                  <Link
                    href="/signup"
                    className="block w-full rounded-full border border-white/20 bg-white/10 py-3 text-center text-sm font-semibold text-white hover:bg-white/15 transition-colors"
                  >
                    {isEs ? "Comenzar Prueba de 14 Días" : "Start 14-Day Free Trial"}
                  </Link>
                </div>
              </div>
            </div>

            {/* COMPARISON TABLE */}
            <div className="mt-16 overflow-hidden rounded-2xl border border-white/10 bg-white/5">
              <div className="px-6 py-4 bg-white/[0.03] border-b border-white/10">
                <h4 className="text-lg font-bold text-white">
                  {isEs ? "Comparación Detallada de Planes" : "Detailed Feature Comparison"}
                </h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  {isEs
                    ? "Compara todas las capacidades en Starter, Pro y Business para los tres oficios."
                    : "Compare capabilities across Starter, Pro, and Business plans for all three trades."}
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-white/10 text-slate-400">
                      <th className="py-3 px-4 font-semibold">{isEs ? "Capacidad" : "Capability"}</th>
                      <th className="py-3 px-4 font-semibold text-center">Starter ($29)</th>
                      <th className="py-3 px-4 font-semibold text-center text-cyan-300">Pro ($49)</th>
                      <th className="py-3 px-4 font-semibold text-center">Business ($79)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-slate-300">
                    {COMPARISON_ROWS.map((row) => (
                      <tr key={row.feature} className="hover:bg-white/[0.02]">
                        <td className="py-3 px-4 font-medium text-white">{row.feature}</td>
                        <td className="py-3 px-4 text-center">
                          {typeof row.starter === "boolean" ? (
                            row.starter ? (
                              <Check className="size-4 text-cyan-400 mx-auto" />
                            ) : (
                              <span className="text-slate-600">—</span>
                            )
                          ) : (
                            <span className="font-semibold text-cyan-300">{row.starter}</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center bg-cyan-950/20">
                          {typeof row.pro === "boolean" ? (
                            row.pro ? (
                              <Check className="size-4 text-cyan-400 mx-auto" />
                            ) : (
                              <span className="text-slate-600">—</span>
                            )
                          ) : (
                            <span className="font-semibold text-cyan-300">{row.pro}</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center">
                          {typeof row.business === "boolean" ? (
                            row.business ? (
                              <Check className="size-4 text-cyan-400 mx-auto" />
                            ) : (
                              <span className="text-slate-600">—</span>
                            )
                          ) : (
                            <span className="font-semibold text-cyan-300">{row.business}</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="mt-8 text-center text-xs text-slate-400">
              <p>
                {isEs
                  ? "Prueba gratis de 14 días en todos los planes • Sin tarjeta de crédito • Cancela cuando quieras en un clic"
                  : "14-day free trial on all plans • No credit card required to start • Cancel anytime with one click"}
              </p>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter lang={lang} />
    </div>
  )
}
