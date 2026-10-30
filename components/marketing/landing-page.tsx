import Image from "next/image"
import Link from "next/link"
import { ArrowRight, Check, Mail, Paintbrush, Video } from "lucide-react"
import { ProposalDemo } from "@/components/marketing/proposal-demo"
import { SiteFooter } from "@/components/marketing/site-footer"

const NAV = [
  { href: "#features", label: "Features" },
  { href: "#how-it-works", label: "How It Works" },
  { href: "#pricing", label: "Pricing" },
  { href: "#proposal-demo", label: "Interactive Proposal Demo" },
] as const

const COLUMNS = [
  {
    name: "Lead",
    cards: [
      { job: "Exterior repaint", place: "North Park", price: "$4,280" },
      { job: "Cabinet refinish", place: "La Jolla", price: "$1,640" },
    ],
  },
  {
    name: "Estimate Sent",
    cards: [
      { job: "Whole interior", place: "Hillcrest", price: "$6,910", badge: "Video" },
      { job: "Garage and trim", place: "Clairemont", price: "$980" },
    ],
  },
  {
    name: "Scheduled",
    cards: [{ job: "Two-story exterior", place: "Pacific Beach", price: "$8,450", badge: "Accepted" }],
  },
] as const

const FEATURES = [
  {
    icon: Video,
    title: "Interactive Proposals with Video Walkthroughs",
    body: "Attach a short walkthrough to the line it belongs to. The customer plays it on the proposal, then accepts.",
  },
  {
    icon: Paintbrush,
    title: "Bilingual English/Spanish Crew Sheets",
    body: "The same work order opens in English or Spanish. Prices stay off the crew sheet.",
  },
  {
    icon: Mail,
    title: "One-Click PDF & Email Link Delivery",
    body: "Email the public proposal link with the PDF attached. The customer opens one link.",
  },
] as const

const STEPS = [
  { step: "01", title: "Price the rooms", body: "Wall area, trim, and cabinets land in one estimate." },
  { step: "02", title: "Send the proposal", body: "The customer gets the link, the PDF, and the line videos." },
  { step: "03", title: "Hand the crew a sheet", body: "English or Spanish, with the scope and no prices." },
] as const

export function LandingPage() {
  return (
    <div className="min-h-dvh bg-[#0B0F17] text-white">
      <header className="sticky top-0 z-30 border-b border-white/10 bg-slate-950/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 md:px-6">
          <a href="#top" aria-label="Scopepipe" className="inline-flex items-center">
            <div className="flex items-center justify-center rounded-lg border border-slate-200 bg-white px-3 py-1.5 shadow-sm">
              <Image
                src="/logo.png"
                alt="Scopepipe"
                width={120}
                height={32}
                priority
                className="h-7 w-auto object-contain"
                style={{ width: "auto" }}
              />
            </div>
          </a>
          <nav className="hidden items-center gap-6 text-sm text-slate-300 lg:flex" aria-label="Page">
            {NAV.map((item) => (
              <a key={item.href} href={item.href} className="hover:text-white">
                {item.label}
              </a>
            ))}
          </nav>
          <div className="flex items-center gap-4">
            <Link href="/login" className="text-sm font-medium text-slate-300 transition-colors hover:text-white">
              Sign In
            </Link>
            <Link
              href="/signup"
              className="rounded-full bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950 shadow-md transition-all hover:bg-cyan-400"
            >
              Start 14-Day Free Trial
            </Link>
          </div>
        </div>
        <nav className="flex gap-4 overflow-x-auto px-4 pb-3 text-sm text-slate-300 lg:hidden" aria-label="Page">
          {NAV.map((item) => (
            <a key={item.href} href={item.href} className="shrink-0 hover:text-white">
              {item.label}
            </a>
          ))}
        </nav>
      </header>

      <main id="top">
        <section className="relative overflow-hidden px-4 pb-20 pt-16 md:px-6 md:pt-24">
          <div
            className="pointer-events-none absolute inset-x-0 top-0 h-[36rem] bg-[radial-gradient(ellipse_at_top,rgba(34,211,238,0.22),transparent_58%)]"
            aria-hidden="true"
          />
          <div className="relative mx-auto max-w-4xl text-center">
            <p className="mx-auto inline-flex items-center gap-3 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-slate-200">
              <span className="flex -space-x-2" aria-hidden="true">
                <span className="size-6 rounded-full border border-[#0B0F17] bg-cyan-400" />
                <span className="size-6 rounded-full border border-[#0B0F17] bg-sky-500" />
                <span className="size-6 rounded-full border border-[#0B0F17] bg-indigo-400" />
              </span>
              <span className="size-2 rounded-full bg-emerald-400" aria-hidden="true" />
              Built for Professional Painting Contractors
            </p>
            <h1 className="mx-auto mt-8 max-w-5xl text-5xl font-bold tracking-tight text-white md:text-7xl">
              Close More Painting Deals. Stop Juggling Apps.
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-slate-300 md:text-xl">
              Scopepipe combines fast estimating, interactive customer proposals with line-item video attachments, and
              automatic bilingual crew sheets—all in one $49/mo platform.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href="/signup"
                className="inline-flex items-center gap-2 rounded-full bg-cyan-400 px-6 py-3 text-base font-semibold text-slate-950 shadow-[0_0_40px_rgba(34,211,238,0.45)] hover:bg-cyan-300"
              >
                Start 14-Day Free Trial
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
              <a
                href="#proposal-demo"
                className="inline-flex items-center rounded-full border border-white/15 bg-white/5 px-6 py-3 text-base font-medium text-white backdrop-blur-md hover:bg-white/10"
              >
                View Sample Proposal
              </a>
            </div>
            <p className="mt-4 text-sm text-slate-400">14-day free trial • No credit card required • Set up in 2 minutes</p>
          </div>

          <div className="relative mx-auto mt-16 max-w-5xl">
            <p className="absolute -left-2 top-10 z-10 hidden rounded-full border border-white/10 bg-slate-950/80 px-3 py-1.5 text-xs font-medium text-cyan-200 shadow-lg backdrop-blur-md md:block">
              Video Attached
            </p>
            <p className="absolute -right-2 top-24 z-10 hidden rounded-full border border-white/10 bg-slate-950/80 px-3 py-1.5 text-xs font-medium text-white shadow-lg backdrop-blur-md lg:block">
              Bilingual Crew View
            </p>
            <p className="absolute bottom-4 left-1/2 z-10 hidden -translate-x-1/2 rounded-full border border-emerald-400/30 bg-emerald-400/15 px-3 py-1.5 text-xs font-medium text-emerald-200 shadow-lg backdrop-blur-md md:block">
              Proposal Accepted
            </p>
            <div className="overflow-hidden rounded-2xl border border-white/10 bg-slate-200 shadow-2xl shadow-blue-500/10">
              <div className="flex items-center gap-2 border-b border-slate-300 bg-slate-100 px-4 py-3">
                <span className="size-2.5 rounded-full bg-slate-300" />
                <span className="size-2.5 rounded-full bg-slate-300" />
                <span className="size-2.5 rounded-full bg-slate-300" />
                <span className="ml-3 rounded-md bg-white px-3 py-1 text-xs text-slate-500">scopepipe.com/dashboard</span>
              </div>
              <div className="grid gap-3 bg-slate-100 p-4 md:grid-cols-3">
                {COLUMNS.map((column) => (
                  <div key={column.name}>
                    <p className="mb-2 text-xs font-semibold tracking-wide text-slate-500 uppercase">{column.name}</p>
                    <div className="space-y-2">
                      {column.cards.map((card) => (
                        <article key={card.job} className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                          <p className="text-sm font-semibold text-slate-900">{card.job}</p>
                          <p className="mt-1 text-xs text-slate-500">{card.place}</p>
                          <div className="mt-3 flex items-center justify-between">
                            <p className="text-sm font-medium text-slate-800">{card.price}</p>
                            {"badge" in card ? (
                              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                                {card.badge}
                              </span>
                            ) : (
                              <span />
                            )}
                          </div>
                        </article>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <ul className="mt-4 flex flex-wrap justify-center gap-2 md:hidden">
              {["Video Attached", "Bilingual Crew View", "Proposal Accepted"].map((label) => (
                <li key={label} className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-200">
                  {label}
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section id="features" className="scroll-mt-24 px-4 py-20 md:px-6">
          <div className="mx-auto grid max-w-6xl gap-4 md:grid-cols-3">
            {FEATURES.map((feature) => (
              <article key={feature.title} className="rounded-2xl border border-white/10 bg-white/5 p-6">
                <feature.icon className="size-5 text-cyan-300" aria-hidden="true" />
                <h2 className="mt-4 text-lg font-semibold tracking-tight">{feature.title}</h2>
                <p className="mt-2 text-sm leading-relaxed text-slate-300">{feature.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="how-it-works" className="scroll-mt-24 px-4 py-8 md:px-6">
          <div className="mx-auto max-w-6xl">
            <h2 className="text-3xl font-bold tracking-tight">How It Works</h2>
            <ol className="mt-8 grid gap-4 md:grid-cols-3">
              {STEPS.map((item) => (
                <li key={item.step} className="rounded-2xl border border-white/10 bg-[#0B0F17] p-6">
                  <p className="text-sm font-medium text-cyan-300">{item.step}</p>
                  <h3 className="mt-3 text-lg font-semibold">{item.title}</h3>
                  <p className="mt-2 text-sm text-slate-300">{item.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <ProposalDemo />

        <section id="pricing" className="scroll-mt-24 px-4 py-20 md:px-6">
          <div className="mx-auto max-w-xl rounded-3xl border border-white/10 bg-white/5 p-8 text-center">
            <h2 className="text-3xl font-bold tracking-tight">Pricing</h2>
            <p className="mt-4 text-5xl font-bold tracking-tight">
              $49<span className="text-xl font-medium text-slate-400">/mo</span>
            </p>
            <ul className="mt-6 space-y-2 text-sm text-slate-300">
              {["Estimates, proposals, and crew sheets", "Line-item video on the proposal", "English and Spanish crew sheets"].map(
                (item) => (
                  <li key={item} className="flex items-center justify-center gap-2">
                    <Check className="size-4 text-cyan-300" aria-hidden="true" />
                    {item}
                  </li>
                ),
              )}
              <li className="flex items-center justify-center gap-3 font-semibold text-cyan-400">
                <svg className="h-5 w-5 shrink-0 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
                Up to 3 Team Seats Included (Owner, PM, Field Lead)
              </li>
            </ul>
            <Link
              href="/signup"
              className="mt-8 inline-flex items-center gap-2 rounded-full bg-cyan-400 px-6 py-3 text-sm font-semibold text-slate-950 shadow-[0_0_32px_rgba(34,211,238,0.4)] hover:bg-cyan-300"
            >
              Start 14-Day Free Trial
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
            <p className="mt-3 text-xs text-slate-400">14-day free trial. No credit card required.</p>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  )
}
