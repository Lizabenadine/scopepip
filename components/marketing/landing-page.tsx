"use client"

import Link from "next/link"
import { BrandLogo } from "@/components/brand/brand-logo"
import {
  ArrowRight,
  BellRing,
  Check,
  CheckCircle2,
  Languages,
  MessageSquare,
  Mic,
  Paintbrush,
  Pencil,
  Play,
  Smartphone,
  Sparkles,
  Users,
  Video,
} from "lucide-react"
import { ProposalDemo } from "@/components/marketing/proposal-demo"
import { SiteFooter } from "@/components/marketing/site-footer"

const NAV = [
  { href: "#features", label: "Features" },
  { href: "#phone-estimator", label: "Mobile Estimator" },
  { href: "#how-it-works", label: "How It Works" },
  { href: "#proposal-demo", label: "Sample Proposal" },
  { href: "#pricing", label: "Pricing" },
  { href: "/affiliates", label: "Affiliates" },
] as const

const CORE_CAPABILITIES = [
  {
    icon: Smartphone,
    title: "Fast Mobile Estimating",
    tagline: "Built for the field, not the desk.",
    body: "Enter room dimensions, choose wall/trim/ceiling surfaces, and generate itemized bids directly on your phone while walking the jobsite.",
  },
  {
    icon: Pencil,
    title: "Sketch & Notes + Photo Markup",
    tagline: "Available on all plans.",
    body: "Draw freehand room layouts, mark repair spots, stamp dimensions, and sketch directly over jobsite photos with finger or stylus.",
  },
  {
    icon: Languages,
    title: "Bilingual Crew Sheets",
    tagline: "English & Spanish on all plans.",
    body: "The crew toggles between English and Spanish on the jobsite work order. Color codes and prep tasks stay clear while your pricing and margins stay private.",
  },
  {
    icon: Mic,
    title: "Hands-Free Voice Notes",
    tagline: "Dictate specs as you walk (Business).",
    body: "Tap the microphone beside any estimate note field to transcribe customer requests, prep notes, and surface conditions using native mobile speech recognition.",
  },
  {
    icon: BellRing,
    title: "Smart Follow-Up Reminders",
    tagline: "Automatic 3 & 7-day prompts (Business).",
    body: "Never lose an unaccepted estimate. One-click personalized follow-up messages automatically stop the moment a proposal is accepted or scheduled.",
  },
  {
    icon: MessageSquare,
    title: "Facebook & Instagram Leads",
    tagline: "Direct into your pipeline (Business).",
    body: "Connect your Facebook Business Page. Homeowner inquiries from Meta Lead Ads and Messenger land in your pipeline with private threading per contractor.",
  },
] as const

const WORKFLOW_STEPS = [
  {
    step: "01",
    title: "Walk the Job & Sketch",
    desc: "Measure or eyeball rooms. Freehand draw sketches, markup photos of repairs, or tap the mic to dictate notes. Scopepipe calculates square footage, coats, and gallons in seconds.",
  },
  {
    step: "02",
    title: "Send Proposal with Video & Colors",
    desc: "Attach an optional 15-second line-item video walk and lock in exact paint colors and sheens before the customer accepts with an e-signature.",
  },
  {
    step: "03",
    title: "Follow Up & Dispatch Crew",
    desc: "Smart reminders trigger at 3 and 7 days with 1-click text copy. Once won, print or share the bilingual crew sheet and price-free paint buy list.",
  },
] as const

const COMPARISON_ROWS = [
  { feature: "Mobile room-by-room estimating", starter: true, pro: true, business: true },
  { feature: "Professional proposals & e-signatures", starter: true, pro: true, business: true },
  { feature: "Price-free paint store buy lists", starter: true, pro: true, business: true },
  { feature: "Sales pipeline & lead tracking", starter: true, pro: true, business: true },
  { feature: "English & Spanish crew work orders", starter: "✓ All plans", pro: "✓ All plans", business: "✓ All plans" },
  { feature: "Sketch & Notes with photo markup", starter: "✓ All plans", pro: "✓ All plans", business: "✓ All plans" },
  { feature: "Line-item video walkthroughs", starter: false, pro: true, business: true },
  { feature: "Room color & sheen customer sign-offs", starter: false, pro: true, business: true },
  { feature: "Automated proposal email & tracking", starter: false, pro: true, business: true },
  { feature: "Hands-free Voice-to-Estimate notes", starter: false, pro: false, business: true },
  { feature: "Smart 3 & 7-day follow-up reminders", starter: false, pro: false, business: true },
  { feature: "Facebook Messenger lead integration", starter: false, pro: false, business: true },
  { feature: "Included user seats", starter: "1 Seat", pro: "3 Seats", business: "5 Seats" },
  { feature: "Additional paid seats supported", starter: "—", pro: "—", business: "Supported" },
] as const

export function LandingPage() {
  return (
    <div className="min-h-dvh bg-[#0B0F17] text-white selection:bg-cyan-500 selection:text-slate-950">
      {/* Top Banner */}
      <div className="border-b border-white/10 bg-[#02182F] px-4 py-2 text-center text-xs font-medium text-slate-300">
        <span className="inline-flex items-center gap-2">
          <span className="size-2 rounded-full bg-cyan-400 animate-pulse" />
          <span>New: Sketch & Notes with Photo Markup is now live across all plans!</span>
        </span>
      </div>

      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#02182F]">
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

          <div className="flex items-center gap-3 sm:gap-4">
            <Link
              href="/login"
              className="text-sm font-semibold text-slate-300 transition-colors hover:text-white"
            >
              Sign In
            </Link>
            <Link
              href="/signup"
              className="inline-flex items-center gap-1.5 rounded-full bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950 shadow-md transition-all hover:bg-cyan-400"
            >
              Start Free Trial
              <ArrowRight className="size-3.5" />
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
        {/* ASYMMETRICAL HERO SECTION */}
        <section className="relative overflow-hidden px-4 pt-10 pb-16 md:px-6 md:pt-16 md:pb-24">
          {/* Original Cyan Glow */}
          <div
            className="pointer-events-none absolute inset-x-0 top-0 h-[38rem] bg-[radial-gradient(ellipse_at_top,rgba(34,211,238,0.22),transparent_58%)]"
            aria-hidden="true"
          />

          <div className="relative mx-auto max-w-6xl">
            <div className="grid items-center gap-12 lg:grid-cols-12 lg:gap-8">
              {/* Left Column: Asymmetrical Typography & Value Proposition */}
              <div className="lg:col-span-7">
                <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3.5 py-1.5 text-xs font-semibold text-slate-200 backdrop-blur-md">
                  <span className="size-2 rounded-full bg-cyan-400" />
                  <span>Trade-Specific Software for Painting Contractors</span>
                  <span className="text-white/20">•</span>
                  <span className="text-cyan-300 font-bold">From $29/mo</span>
                </div>

                <h1 className="mt-6 text-4xl font-extrabold tracking-tight text-white sm:text-5xl md:text-6xl lg:leading-[1.12]">
                  Walk the job. <br />
                  <span className="text-white">Build the estimate. </span>
                  <span className="text-cyan-400 underline decoration-cyan-400/40 decoration-4 underline-offset-6">
                    Win the work.
                  </span>
                </h1>

                <p className="mt-6 max-w-xl text-lg leading-relaxed text-slate-300 sm:text-xl">
                  The mobile estimator painters actually use on-site. Sketch room layouts, markup jobsite photos, generate whole-can paint buy lists, lock colors, and win jobs with video proposals and smart follow-ups.
                </p>

                {/* Key live benefit badges */}
                <div className="mt-6 grid max-w-lg grid-cols-1 gap-2.5 sm:grid-cols-2 text-xs font-medium text-slate-200">
                  <div className="flex items-center gap-2 rounded-lg bg-white/5 border border-white/10 p-2.5 backdrop-blur-xs">
                    <CheckCircle2 className="size-4 text-cyan-400 shrink-0" />
                    <span>Sketch & Notes + photo markup</span>
                  </div>
                  <div className="flex items-center gap-2 rounded-lg bg-white/5 border border-white/10 p-2.5 backdrop-blur-xs">
                    <CheckCircle2 className="size-4 text-cyan-400 shrink-0" />
                    <span>Bilingual crew work orders</span>
                  </div>
                  <div className="flex items-center gap-2 rounded-lg bg-white/5 border border-white/10 p-2.5 backdrop-blur-xs">
                    <CheckCircle2 className="size-4 text-cyan-400 shrink-0" />
                    <span>Price-free paint buy lists</span>
                  </div>
                  <div className="flex items-center gap-2 rounded-lg bg-white/5 border border-white/10 p-2.5 backdrop-blur-xs">
                    <CheckCircle2 className="size-4 text-cyan-400 shrink-0" />
                    <span>Facebook Messenger leads</span>
                  </div>
                </div>

                {/* Hero CTAs */}
                <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
                  <Link
                    href="/signup"
                    className="inline-flex items-center justify-center gap-2 rounded-full bg-cyan-400 px-6 py-3.5 text-base font-bold text-slate-950 shadow-[0_0_35px_rgba(34,211,238,0.45)] transition-all hover:bg-cyan-300"
                  >
                    Start 14-Day Free Trial
                    <ArrowRight className="size-4" />
                  </Link>
                  <a
                    href="#proposal-demo"
                    className="inline-flex items-center justify-center gap-2 rounded-full border border-white/15 bg-white/5 px-6 py-3.5 text-base font-semibold text-white backdrop-blur-md transition-colors hover:bg-white/10"
                  >
                    <Play className="size-4 text-cyan-300 fill-cyan-300" />
                    View Sample Proposal
                  </a>
                </div>

                <div className="mt-4 flex items-center gap-4 text-xs text-slate-400">
                  <span className="flex items-center gap-1.5">
                    <Check className="size-3.5 text-emerald-400" /> 14-day free trial
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Check className="size-3.5 text-emerald-400" /> No credit card required
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Check className="size-3.5 text-emerald-400" /> Instant setup
                  </span>
                </div>
              </div>

              {/* Right Column: Prominent Mobile Phone Estimator Preview */}
              <div id="phone-estimator" className="relative lg:col-span-5 flex justify-center">
                {/* Micro-badge 1: Top Floating Pill */}
                <div className="absolute -top-4 -left-4 sm:-left-8 z-20 flex items-center gap-2.5 rounded-2xl border border-white/15 bg-slate-950/90 px-3.5 py-2 shadow-xl backdrop-blur-md animate-bounce [animation-duration:3s]">
                  <div className="flex size-7 items-center justify-center rounded-xl bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                    <Pencil className="size-4" />
                  </div>
                  <div>
                    <p className="text-[11px] font-bold text-white leading-none">Sketch & Notes</p>
                    <p className="text-[10px] text-cyan-300 mt-0.5">Photo markup & dimensions</p>
                  </div>
                </div>

                {/* Micro-badge 2: Bottom Floating Pill */}
                <div className="absolute -bottom-4 -right-4 sm:-right-6 z-20 flex items-center gap-2.5 rounded-2xl border border-white/15 bg-slate-950/90 px-3.5 py-2 shadow-xl backdrop-blur-md">
                  <div className="flex size-7 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    <BellRing className="size-4" />
                  </div>
                  <div>
                    <p className="text-[11px] font-bold text-white leading-none">Smart Follow-Up</p>
                    <p className="text-[10px] text-emerald-300 font-semibold mt-0.5">Day 3 prompt ready</p>
                  </div>
                </div>

                {/* Smartphone Device Frame */}
                <div className="relative w-full max-w-[340px] sm:max-w-[360px] rounded-[2.8rem] bg-slate-950 p-3 shadow-2xl ring-1 ring-white/15 shadow-cyan-500/10 border border-white/10">
                  {/* Dynamic Island / Speaker Pill */}
                  <div className="absolute top-4 left-1/2 -translate-x-1/2 h-4 w-28 rounded-full bg-slate-900 z-30" />

                  {/* Inner Screen */}
                  <div className="overflow-hidden rounded-[2.2rem] bg-[#0A1222] border border-white/10 text-white">
                    {/* Device Status Bar */}
                    <div className="flex items-center justify-between px-6 pt-3 pb-1 text-[11px] font-semibold text-slate-400">
                      <span>9:41</span>
                      <div className="flex items-center gap-1.5">
                        <span className="size-2 rounded-full bg-cyan-400" />
                        <span>5G</span>
                      </div>
                    </div>

                    {/* App Header */}
                    <div className="border-b border-white/10 bg-[#02182F] px-4 py-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-[10px] font-bold tracking-wider uppercase text-cyan-400">
                            Scopepipe Estimator
                          </span>
                          <h4 className="text-sm font-bold text-white">Master Bedroom & Bath</h4>
                        </div>
                        <span className="rounded-full bg-cyan-500/15 px-2.5 py-0.5 text-[10px] font-semibold text-cyan-300 border border-cyan-500/30">
                          Room 2 of 5
                        </span>
                      </div>
                      <p className="mt-1 text-[11px] text-slate-400">16&apos; × 14&apos; • 9ft Ceilings • 2 Coats</p>
                    </div>

                    {/* Mobile Estimator Body */}
                    <div className="space-y-3 p-3.5 text-xs">
                      {/* Sketch & Notes Preview Card */}
                      <div className="rounded-xl border border-cyan-400/30 bg-cyan-950/40 p-2.5">
                        <div className="flex items-center justify-between text-[11px] font-semibold text-cyan-300">
                          <span className="flex items-center gap-1.5">
                            <Pencil className="size-3.5 text-cyan-400" />
                            Room Sketch & Photo Markup
                          </span>
                          <span className="text-[10px] text-cyan-400">Saved</span>
                        </div>
                        <p className="mt-1.5 text-[11px] leading-relaxed text-slate-200 italic">
                          &ldquo;Drywall patch marked near closet. SW Repose Gray satin on walls, Extra White on trim.&rdquo;
                        </p>
                      </div>

                      {/* Surface Breakdown Table */}
                      <div className="rounded-xl border border-white/10 bg-white/5 p-2.5 shadow-2xs space-y-2">
                        <div className="flex items-center justify-between pb-1.5 border-b border-white/10 font-semibold text-[11px] text-slate-400">
                          <span>Surface</span>
                          <span>Quantity</span>
                          <span>Gallons</span>
                        </div>
                        <div className="flex items-center justify-between text-[11px]">
                          <div>
                            <p className="font-semibold text-white">Walls (Drywall)</p>
                            <p className="text-[10px] text-slate-400">2 coats • SW Repose Gray</p>
                          </div>
                          <span className="text-slate-300">540 sq ft</span>
                          <span className="font-bold text-cyan-300">3.6 gal</span>
                        </div>
                        <div className="flex items-center justify-between text-[11px]">
                          <div>
                            <p className="font-semibold text-white">Baseboards & Doors</p>
                            <p className="text-[10px] text-slate-400">Semi-gloss • 2 doors</p>
                          </div>
                          <span className="text-slate-300">76 lin ft</span>
                          <span className="font-bold text-cyan-300">1.2 gal</span>
                        </div>
                        <div className="flex items-center justify-between text-[11px]">
                          <div>
                            <p className="font-semibold text-white">Ceiling</p>
                            <p className="text-[10px] text-slate-400">Flat ceiling white</p>
                          </div>
                          <span className="text-slate-300">224 sq ft</span>
                          <span className="font-bold text-cyan-300">1.4 gal</span>
                        </div>
                      </div>

                      {/* Instant Cost & Gallon Buy Summary */}
                      <div className="rounded-xl bg-[#02182F] border border-cyan-400/20 p-3 text-white">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-300">Room Estimate Total:</span>
                          <span className="text-base font-bold text-cyan-400">$1,480.00</span>
                        </div>
                        <div className="mt-1 flex items-center justify-between text-[11px] text-slate-400 border-t border-white/10 pt-1.5">
                          <span>Buy List Gallons:</span>
                          <span className="font-semibold text-cyan-200">5 Gal (Whole Cans)</span>
                        </div>
                      </div>

                      {/* Quick Action Button */}
                      <button
                        type="button"
                        className="w-full rounded-xl bg-cyan-400 py-2.5 text-center text-xs font-bold text-slate-950 shadow-md hover:bg-cyan-300 transition-colors"
                      >
                        Send Video Proposal & Buy List →
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CORE FEATURES GRID */}
        <section id="features" className="scroll-mt-24 border-t border-white/10 bg-[#0B0F17] px-4 py-20 md:px-6">
          <div className="mx-auto max-w-6xl">
            <div className="max-w-2xl">
              <span className="text-xs font-bold tracking-wider uppercase text-cyan-400">
                Purpose-Built for Painting
              </span>
              <h2 className="mt-2 text-3xl font-bold tracking-tight text-white sm:text-4xl">
                Everything you need on the ladder, at the counter, and in the truck.
              </h2>
              <p className="mt-3 text-base text-slate-300">
                Scopepipe replaces messy notes, guesswork pricing, and disconnected spreadsheets with a seamless, mobile-first workflow.
              </p>
            </div>

            <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {CORE_CAPABILITIES.map((feat) => (
                <article
                  key={feat.title}
                  className="group relative rounded-2xl border border-white/10 bg-white/5 p-6 transition-all hover:border-cyan-400/60 hover:bg-white/[0.08]"
                >
                  <div className="flex size-11 items-center justify-center rounded-xl bg-white/10 border border-white/10 text-cyan-300 group-hover:bg-cyan-400 group-hover:text-slate-950 transition-colors">
                    <feat.icon className="size-5" />
                  </div>
                  <h3 className="mt-4 text-lg font-bold text-white">{feat.title}</h3>
                  <p className="mt-1 text-xs font-semibold text-cyan-300">{feat.tagline}</p>
                  <p className="mt-2.5 text-sm leading-relaxed text-slate-300">{feat.body}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* DETAILED HIGHLIGHT: SKETCH & NOTES & SMART FOLLOW-UPS */}
        <section className="border-t border-white/10 bg-[#070D18] px-4 py-20 md:px-6">
          <div className="mx-auto max-w-6xl">
            <div className="grid items-center gap-12 lg:grid-cols-2">
              {/* Feature 1: Sketch & Notes + Photo Markup */}
              <div className="rounded-3xl border border-white/10 bg-white/5 p-8 shadow-xl backdrop-blur-md">
                <div className="inline-flex size-10 items-center justify-center rounded-xl bg-cyan-950/60 border border-cyan-500/30 text-cyan-300">
                  <Pencil className="size-5" />
                </div>
                <h3 className="mt-4 text-2xl font-bold text-white">
                  Sketch & Notes: Freehand Draw & Markup Photos
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-slate-300">
                  Included on all plans. Draw freehand room layouts with finger or stylus, stamp room dimensions, mark repair spots, or snap a photo of damaged sheetrock and annotate directly over it on your phone.
                </p>
                <ul className="mt-6 space-y-2.5 text-xs font-medium text-slate-200">
                  <li className="flex items-center gap-2">
                    <Check className="size-4 text-cyan-400 shrink-0" />
                    <span>Freehand stylus/touch drawing with pen, colors & eraser</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="size-4 text-cyan-400 shrink-0" />
                    <span>Photo markup: take jobsite pictures and draw directly over them</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="size-4 text-cyan-400 shrink-0" />
                    <span>Private internal note by default; optional toggle to include in proposal</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="size-4 text-cyan-400 shrink-0" />
                    <span>Crew members see approved instructions without private pricing</span>
                  </li>
                </ul>
              </div>

              {/* Feature 2: Smart Follow-Up Engine */}
              <div className="rounded-3xl border border-white/10 bg-white/5 p-8 shadow-xl backdrop-blur-md">
                <div className="inline-flex size-10 items-center justify-center rounded-xl bg-cyan-950/60 border border-cyan-500/30 text-cyan-300">
                  <BellRing className="size-5" />
                </div>
                <h3 className="mt-4 text-2xl font-bold text-white">
                  Smart Follow-Up Reminders at 3 & 7 Days
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-slate-300">
                  Available on the Business plan. Contractors lose up to 30% of sent proposals simply because they forget to follow up. Scopepipe monitors sent bids and triggers reminders at day 3 and day 7 with 1-click personalized text/email copy.
                </p>
                <ul className="mt-6 space-y-2.5 text-xs font-medium text-slate-200">
                  <li className="flex items-center gap-2">
                    <Check className="size-4 text-cyan-400 shrink-0" />
                    <span>1-click copy for personalized client messages</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="size-4 text-cyan-400 shrink-0" />
                    <span>Dismiss reminders whenever you&apos;ve connected</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="size-4 text-cyan-400 shrink-0" />
                    <span>Automatically stops reminders once proposal is accepted</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section id="how-it-works" className="scroll-mt-24 border-t border-white/10 bg-[#0B0F17] px-4 py-20 md:px-6">
          <div className="mx-auto max-w-6xl">
            <div className="text-center max-w-xl mx-auto">
              <span className="text-xs font-bold tracking-wider uppercase text-cyan-400">
                Simple 3-Step Process
              </span>
              <h2 className="mt-2 text-3xl font-bold tracking-tight text-white sm:text-4xl">
                How Scopepipe Works
              </h2>
              <p className="mt-3 text-sm text-slate-300">
                From the first homeowner walk to the final coat of paint, stay organized without the software clutter.
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

        {/* SAMPLE PROPOSAL DEMO */}
        <section id="proposal-demo" className="scroll-mt-24 border-t border-white/10 bg-[#070D18]">
          <ProposalDemo />
        </section>

        {/* RESTORED THREE SUBSCRIPTION TIERS */}
        <section id="pricing" className="scroll-mt-24 border-t border-white/10 bg-[#0B0F17] px-4 py-20 md:px-6">
          <div className="mx-auto max-w-6xl">
            <div className="text-center max-w-2xl mx-auto">
              <span className="rounded-full bg-cyan-500/15 border border-cyan-400/30 px-3.5 py-1 text-xs font-bold text-cyan-300 uppercase tracking-wide">
                Transparent Plans
              </span>
              <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
                Choose the plan that fits your business
              </h2>
              <p className="mt-3 text-sm text-slate-300">
                Start on any plan with a 14-day free trial. No credit card required to start. Change plans anytime.
              </p>
            </div>

            {/* Three Pricing Cards */}
            <div className="mt-12 grid gap-6 lg:grid-cols-3 items-stretch">
              {/* Plan 1: Starter */}
              <div className="flex flex-col justify-between rounded-3xl border border-white/10 bg-white/5 p-7 transition-all hover:border-white/20">
                <div>
                  <h3 className="text-xl font-bold text-white">Starter</h3>
                  <p className="mt-1 text-xs text-slate-400">For solo painters estimating & running their own jobs.</p>
                  <div className="mt-6 flex items-baseline gap-1">
                    <span className="text-5xl font-extrabold tracking-tight text-white">$29</span>
                    <span className="text-sm font-semibold text-slate-400">/month</span>
                  </div>
                  <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-slate-800 px-3 py-1 text-xs font-semibold text-slate-200 border border-white/10">
                    <Users className="size-3.5 text-cyan-400" />
                    <span>1 Included user seat</span>
                  </div>
                  <ul className="mt-6 space-y-2.5 text-xs text-slate-300">
                    <li className="flex items-center gap-2">
                      <Check className="size-4 text-cyan-400 shrink-0" />
                      <span>Mobile room-by-room estimating</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="size-4 text-cyan-400 shrink-0" />
                      <span>Professional proposals & e-signatures</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="size-4 text-cyan-400 shrink-0" />
                      <span>Price-free paint store buy lists</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="size-4 text-cyan-400 shrink-0" />
                      <span>Sales pipeline & lead tracking</span>
                    </li>
                    <li className="flex items-center gap-2 font-medium text-cyan-200">
                      <Check className="size-4 text-cyan-400 shrink-0" />
                      <span>English & Spanish crew work orders</span>
                    </li>
                    <li className="flex items-center gap-2 font-medium text-cyan-200">
                      <Check className="size-4 text-cyan-400 shrink-0" />
                      <span>Sketch & Notes with photo markup</span>
                    </li>
                  </ul>
                </div>
                <div className="mt-8">
                  <Link
                    href="/signup"
                    className="block w-full rounded-full border border-white/20 bg-white/10 py-3 text-center text-sm font-semibold text-white hover:bg-white/15 transition-colors"
                  >
                    Start 14-Day Free Trial
                  </Link>
                </div>
              </div>

              {/* Plan 2: Pro (MOST POPULAR) */}
              <div className="relative flex flex-col justify-between rounded-3xl border-2 border-cyan-400 bg-gradient-to-b from-[#0F223D] to-[#0A1629] p-7 shadow-2xl shadow-cyan-500/20 lg:-translate-y-2">
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-cyan-400 px-3.5 py-0.5 text-[11px] font-extrabold text-slate-950 uppercase tracking-wider shadow-md">
                  Most Popular
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white flex items-center justify-between">
                    <span>Pro</span>
                    <Sparkles className="size-5 text-cyan-300" />
                  </h3>
                  <p className="mt-1 text-xs text-slate-300">For growing paint businesses selling bids & scheduling crews.</p>
                  <div className="mt-6 flex items-baseline gap-1">
                    <span className="text-5xl font-extrabold tracking-tight text-white">$49</span>
                    <span className="text-sm font-semibold text-slate-400">/month</span>
                  </div>
                  <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-cyan-500/20 px-3 py-1 text-xs font-bold text-cyan-300 border border-cyan-400/40">
                    <Users className="size-3.5 text-cyan-300" />
                    <span>3 Included user seats</span>
                  </div>
                  <ul className="mt-6 space-y-2.5 text-xs text-slate-200">
                    <li className="flex items-center gap-2 font-semibold text-white">
                      <Check className="size-4 text-cyan-400 shrink-0" />
                      <span>Everything in Starter</span>
                    </li>
                    <li className="flex items-center gap-2 font-medium text-cyan-200">
                      <Check className="size-4 text-cyan-400 shrink-0" />
                      <span>3 Included team seats</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="size-4 text-cyan-400 shrink-0" />
                      <span>Line-item video walkthrough proposals</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="size-4 text-cyan-400 shrink-0" />
                      <span>Room-by-room color & sheen sign-offs</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="size-4 text-cyan-400 shrink-0" />
                      <span>Automated proposal email & view tracking</span>
                    </li>
                    <li className="flex items-center gap-2 font-medium text-cyan-200">
                      <Check className="size-4 text-cyan-400 shrink-0" />
                      <span>Sketch & Notes + Spanish on work orders</span>
                    </li>
                  </ul>
                </div>
                <div className="mt-8">
                  <Link
                    href="/signup"
                    className="block w-full rounded-full bg-cyan-400 py-3.5 text-center text-sm font-bold text-slate-950 shadow-[0_0_30px_rgba(34,211,238,0.45)] hover:bg-cyan-300 transition-all"
                  >
                    Start 14-Day Free Trial
                  </Link>
                </div>
              </div>

              {/* Plan 3: Business */}
              <div className="flex flex-col justify-between rounded-3xl border border-white/10 bg-white/5 p-7 transition-all hover:border-white/20">
                <div>
                  <h3 className="text-xl font-bold text-white">Business</h3>
                  <p className="mt-1 text-xs text-slate-400">For established contractors scaling volume & crew ops.</p>
                  <div className="mt-6 flex items-baseline gap-1">
                    <span className="text-5xl font-extrabold tracking-tight text-white">$79</span>
                    <span className="text-sm font-semibold text-slate-400">/month</span>
                  </div>
                  <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-slate-800 px-3 py-1 text-xs font-semibold text-slate-200 border border-white/10">
                    <Users className="size-3.5 text-cyan-400" />
                    <span>5 Included seats (+ additional seats supported)</span>
                  </div>
                  <ul className="mt-6 space-y-2.5 text-xs text-slate-300">
                    <li className="flex items-center gap-2 font-semibold text-white">
                      <Check className="size-4 text-cyan-400 shrink-0" />
                      <span>Everything in Pro</span>
                    </li>
                    <li className="flex items-center gap-2 font-medium text-cyan-200">
                      <Check className="size-4 text-cyan-400 shrink-0" />
                      <span>5 Included seats + purchase extra seats</span>
                    </li>
                    <li className="flex items-center gap-2 font-medium text-cyan-200">
                      <Check className="size-4 text-cyan-400 shrink-0" />
                      <span>Hands-free Voice-to-Estimate notes</span>
                    </li>
                    <li className="flex items-center gap-2 font-medium text-cyan-200">
                      <Check className="size-4 text-cyan-400 shrink-0" />
                      <span>Smart 3 & 7-day follow-up reminders</span>
                    </li>
                    <li className="flex items-center gap-2 font-medium text-cyan-200">
                      <Check className="size-4 text-cyan-400 shrink-0" />
                      <span>Facebook & Instagram Messenger leads</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="size-4 text-cyan-400 shrink-0" />
                      <span>Priority contractor support</span>
                    </li>
                  </ul>
                </div>
                <div className="mt-8">
                  <Link
                    href="/signup"
                    className="block w-full rounded-full border border-white/20 bg-white/10 py-3 text-center text-sm font-semibold text-white hover:bg-white/15 transition-colors"
                  >
                    Start 14-Day Free Trial
                  </Link>
                </div>
              </div>
            </div>

            {/* FEATURE COMPARISON TABLE */}
            <div className="mt-16 overflow-hidden rounded-2xl border border-white/10 bg-white/5">
              <div className="px-6 py-4 bg-white/[0.03] border-b border-white/10">
                <h4 className="text-lg font-bold text-white">Detailed Feature Comparison</h4>
                <p className="text-xs text-slate-400 mt-0.5">Compare features across Starter, Pro, and Business plans.</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-white/10 text-slate-400">
                      <th className="py-3 px-4 font-semibold">Capability</th>
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
              <p>14-day free trial on all plans • No credit card required to start • Cancel anytime with one click</p>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  )
}
