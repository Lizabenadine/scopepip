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
  Play,
  Smartphone,
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
    icon: Mic,
    title: "Hands-Free Voice Notes",
    tagline: "Dictate specs as you walk.",
    body: "Tap the microphone beside any estimate note field to transcribe customer requests, prep notes, and surface conditions using native mobile speech recognition.",
  },
  {
    icon: BellRing,
    title: "Smart Follow-Up Reminders",
    tagline: "Automatic 3-day & 7-day cadence.",
    body: "Never lose an unaccepted estimate. One-click personalized follow-up messages automatically stop the moment a proposal is accepted or scheduled.",
  },
  {
    icon: MessageSquare,
    title: "Facebook & Instagram Leads",
    tagline: "Direct into your pipeline.",
    body: "Connect your Facebook Business Page. Homeowner inquiries from Meta Lead Ads and Messenger land in your pipeline with private threading per contractor.",
  },
  {
    icon: Paintbrush,
    title: "Paint Counter Buy Lists",
    tagline: "Gallons mapped by room, price-free.",
    body: "Instantly convert square footage into rounded paint gallon counts grouped by product and room. Hand it to your crew or text it to your paint rep.",
  },
  {
    icon: Languages,
    title: "Bilingual Crew Sheets",
    tagline: "English & Spanish at one tap.",
    body: "The crew toggles between English and Spanish on the jobsite work order. Color codes and prep tasks stay clear while your pricing and margins stay private.",
  },
] as const

const WORKFLOW_STEPS = [
  {
    step: "01",
    title: "Walk the Job & Dictate",
    desc: "Measure or eyeball the room. Tap the mic to record prep notes and client requests. Scopepipe calculates square footage, coats, and gallons in seconds.",
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

export function LandingPage() {
  return (
    <div className="min-h-dvh bg-[#0B0F17] text-white selection:bg-cyan-500 selection:text-slate-950">
      {/* Top Banner */}
      <div className="border-b border-white/10 bg-[#02182F] px-4 py-2 text-center text-xs font-medium text-slate-300">
        <span className="inline-flex items-center gap-2">
          <span className="size-2 rounded-full bg-cyan-400 animate-pulse" />
          <span>New: Voice-to-Estimate Notes & Smart 3/7-Day Follow-Up Reminders are now live</span>
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
                  <span className="text-cyan-300 font-bold">$49/mo Flat</span>
                </div>

                <h1 className="mt-6 text-4xl font-extrabold tracking-tight text-white sm:text-5xl md:text-6xl lg:leading-[1.12]">
                  Walk the job. <br />
                  <span className="text-white">Build the estimate. </span>
                  <span className="text-cyan-400 underline decoration-cyan-400/40 decoration-4 underline-offset-6">
                    Win the work.
                  </span>
                </h1>

                <p className="mt-6 max-w-xl text-lg leading-relaxed text-slate-300 sm:text-xl">
                  The mobile estimator painters actually use on-site. Dictate notes hands-free, generate whole-can paint buy lists, lock room colors, and close jobs with video proposals and automated 3 & 7-day follow-ups.
                </p>

                {/* Key live benefit badges */}
                <div className="mt-6 grid max-w-lg grid-cols-1 gap-2.5 sm:grid-cols-2 text-xs font-medium text-slate-200">
                  <div className="flex items-center gap-2 rounded-lg bg-white/5 border border-white/10 p-2.5 backdrop-blur-xs">
                    <CheckCircle2 className="size-4 text-cyan-400 shrink-0" />
                    <span>Voice-to-text estimate notes</span>
                  </div>
                  <div className="flex items-center gap-2 rounded-lg bg-white/5 border border-white/10 p-2.5 backdrop-blur-xs">
                    <CheckCircle2 className="size-4 text-cyan-400 shrink-0" />
                    <span>Price-free paint buy lists</span>
                  </div>
                  <div className="flex items-center gap-2 rounded-lg bg-white/5 border border-white/10 p-2.5 backdrop-blur-xs">
                    <CheckCircle2 className="size-4 text-cyan-400 shrink-0" />
                    <span>Facebook Messenger leads</span>
                  </div>
                  <div className="flex items-center gap-2 rounded-lg bg-white/5 border border-white/10 p-2.5 backdrop-blur-xs">
                    <CheckCircle2 className="size-4 text-cyan-400 shrink-0" />
                    <span>Bilingual crew work orders</span>
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
                    <Check className="size-3.5 text-emerald-400" /> 3 Team seats included
                  </span>
                </div>
              </div>

              {/* Right Column: Prominent Mobile Phone Estimator Preview */}
              <div id="phone-estimator" className="relative lg:col-span-5 flex justify-center">
                {/* Micro-badge 1: Top Floating Pill */}
                <div className="absolute -top-4 -left-4 sm:-left-8 z-20 flex items-center gap-2.5 rounded-2xl border border-white/15 bg-slate-950/90 px-3.5 py-2 shadow-xl backdrop-blur-md animate-bounce [animation-duration:3s]">
                  <div className="flex size-7 items-center justify-center rounded-xl bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                    <Mic className="size-4" />
                  </div>
                  <div>
                    <p className="text-[11px] font-bold text-white leading-none">Voice-to-Text</p>
                    <p className="text-[10px] text-cyan-300 mt-0.5">Dictated on-site in 3s</p>
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
                      {/* Voice Note Transcription Card */}
                      <div className="rounded-xl border border-cyan-400/30 bg-cyan-950/40 p-2.5">
                        <div className="flex items-center justify-between text-[11px] font-semibold text-cyan-300">
                          <span className="flex items-center gap-1.5">
                            <Mic className="size-3.5 text-cyan-400" />
                            Voice Note Dictated
                          </span>
                          <span className="text-[10px] text-cyan-400">Just now</span>
                        </div>
                        <p className="mt-1.5 text-[11px] leading-relaxed text-slate-200 italic">
                          &ldquo;Satin Repose Gray SW 7015 on walls. Trim is Extra White semi-gloss. Minor patch by closet door.&rdquo;
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

        {/* DETAILED HIGHLIGHT: VOICE NOTES & SMART FOLLOW-UPS */}
        <section className="border-t border-white/10 bg-[#070D18] px-4 py-20 md:px-6">
          <div className="mx-auto max-w-6xl">
            <div className="grid items-center gap-12 lg:grid-cols-2">
              {/* Feature 1: Voice-to-Estimate Notes */}
              <div className="rounded-3xl border border-white/10 bg-white/5 p-8 shadow-xl backdrop-blur-md">
                <div className="inline-flex size-10 items-center justify-center rounded-xl bg-cyan-950/60 border border-cyan-500/30 text-cyan-300">
                  <Mic className="size-5" />
                </div>
                <h3 className="mt-4 text-2xl font-bold text-white">
                  Voice-to-Estimate Notes: Stop Typing in the Field
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-slate-300">
                  When walking a client&apos;s home, tapping on small keyboards is slow and prone to errors. With Scopepipe, simply tap the microphone icon next to any room notes field. Speak naturally—the browser automatically transcribes surface prep, sheetrock repairs, and paint color specs directly into the estimate.
                </p>
                <ul className="mt-6 space-y-2.5 text-xs font-medium text-slate-200">
                  <li className="flex items-center gap-2">
                    <Check className="size-4 text-cyan-400 shrink-0" />
                    <span>Works natively on iOS Safari, Chrome, and Android</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="size-4 text-cyan-400 shrink-0" />
                    <span>Transcriptions can be edited, appended, or cleared at any time</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="size-4 text-cyan-400 shrink-0" />
                    <span>Zero paid transcription APIs or third-party per-word fees</span>
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
                  Contractors lose up to 30% of sent proposals simply because they forget to follow up. When you send an estimate, Scopepipe monitors its acceptance status. If unaccepted, smart reminder cards appear in your pipeline at day 3 and day 7 with one-click personalized messages ready to text or email.
                </p>
                <ul className="mt-6 space-y-2.5 text-xs font-medium text-slate-200">
                  <li className="flex items-center gap-2">
                    <Check className="size-4 text-cyan-400 shrink-0" />
                    <span>1-click copy for personalized client messages</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="size-4 text-cyan-400 shrink-0" />
                    <span>Dismiss reminders whenever you&apos;ve already connected</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="size-4 text-cyan-400 shrink-0" />
                    <span>Automatically stops reminders when proposal is accepted or scheduled</span>
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

        {/* PRICING SECTION */}
        <section id="pricing" className="scroll-mt-24 border-t border-white/10 bg-[#0B0F17] px-4 py-20 md:px-6">
          <div className="mx-auto max-w-2xl rounded-3xl border border-white/15 bg-gradient-to-b from-[#0F1E36] to-[#0B1527] p-8 sm:p-12 text-center shadow-2xl shadow-cyan-500/10">
            <span className="rounded-full bg-cyan-500/15 border border-cyan-400/30 px-3.5 py-1 text-xs font-bold text-cyan-300 uppercase tracking-wide">
              Simple & Transparent
            </span>
            <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
              One Plan. Everything Included.
            </h2>
            <p className="mt-3 text-sm text-slate-300">
              No tier upgrades, no surprise add-ons, and no per-user penalties.
            </p>

            <div className="mt-8 flex items-baseline justify-center gap-1">
              <span className="text-6xl font-extrabold tracking-tight text-white">$49</span>
              <span className="text-xl font-semibold text-slate-400">/month</span>
            </div>

            <p className="mt-2 text-xs font-bold text-cyan-400 uppercase tracking-wider">
              Includes 3 Full Team Seats
            </p>

            <div className="mt-8 grid gap-3 text-left sm:grid-cols-2 text-xs font-medium text-slate-200">
              <div className="flex items-center gap-2">
                <Check className="size-4 text-cyan-400 shrink-0" />
                <span>Fast mobile room estimating</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="size-4 text-cyan-400 shrink-0" />
                <span>Voice-to-text estimate notes</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="size-4 text-cyan-400 shrink-0" />
                <span>Smart 3 & 7-day follow-up reminders</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="size-4 text-cyan-400 shrink-0" />
                <span>Facebook & Messenger lead capture</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="size-4 text-cyan-400 shrink-0" />
                <span>Room-mapped paint store buy lists</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="size-4 text-cyan-400 shrink-0" />
                <span>Bilingual English/Spanish crew sheets</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="size-4 text-cyan-400 shrink-0" />
                <span>Line-item video proposals</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="size-4 text-cyan-400 shrink-0" />
                <span>Room-by-room color sign-offs</span>
              </div>
            </div>

            <div className="mt-10">
              <Link
                href="/signup"
                className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-full bg-cyan-400 px-8 py-4 text-base font-bold text-slate-950 shadow-[0_0_35px_rgba(34,211,238,0.45)] transition-all hover:bg-cyan-300"
              >
                Start 14-Day Free Trial
                <ArrowRight className="size-4" />
              </Link>
            </div>
            <p className="mt-3 text-xs text-slate-400">
              14-day free trial • No credit card required • Cancel anytime
            </p>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  )
}
