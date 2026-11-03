import type { Metadata } from "next"
import Link from "next/link"
import { BrandLogo } from "@/components/brand/brand-logo"
import { SiteFooter } from "@/components/marketing/site-footer"

export const metadata: Metadata = {
  title: "Sample painting proposal",
  description:
    "A sample painting proposal with rooms, colors, sheens, gallons, and a deposit. This is the page a homeowner opens.",
}

const ROOMS = [
  {
    name: "Living room",
    detail: "Walls and ceiling. Agreeable Gray, eggshell on the walls, flat on the ceiling.",
    price: "$1,840",
  },
  {
    name: "Primary bedroom",
    detail: "Walls, ceiling, and trim. Accessible Beige, eggshell walls, semi-gloss trim.",
    price: "$1,260",
  },
  {
    name: "Hall and doors",
    detail: "Hall walls and six doors. Same wall color, semi-gloss on the doors.",
    price: "$640",
  },
] as const

export default function SampleProposalPage() {
  return (
    <div className="min-h-dvh bg-[#0B0F17] text-white">
      <header className="border-b border-white/10 bg-[#02182F]">
        <div className="mx-auto flex min-h-16 max-w-6xl items-center justify-between gap-4 px-4 py-2 md:px-6">
          <BrandLogo href="/" />
          <Link href="/signup" className="rounded-full bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-cyan-400">
            Start 14-Day Free Trial
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-12 md:px-6">
        <p className="text-sm font-medium text-cyan-300">Sample proposal</p>
        <h1 className="mt-3 text-4xl font-bold tracking-tight">Whole interior</h1>
        <p className="mt-3 text-slate-300">22 Cedar Court. This is the page the customer opens from the email. Prices on a real proposal come from the estimate.</p>
        <article className="mt-8 rounded-2xl bg-white p-5 text-slate-900 shadow-2xl">
          <p className="text-xs font-medium tracking-wide text-slate-500 uppercase">Proposal</p>
          <h2 className="mt-1 text-2xl font-semibold">Interior repaint</h2>
          <ul className="mt-6 divide-y divide-slate-200">
            {ROOMS.map((room) => (
              <li key={room.name} className="flex items-start justify-between gap-4 py-4">
                <div>
                  <p className="font-medium">{room.name}</p>
                  <p className="mt-1 text-sm text-slate-500">{room.detail}</p>
                </div>
                <p className="font-semibold tabular-nums">{room.price}</p>
              </li>
            ))}
          </ul>
          <div className="mt-2 flex items-end justify-between border-t border-slate-200 pt-4">
            <div className="text-sm text-slate-500">
              <p>Deposit 30% · $1,122</p>
              <p>Balance · $2,618</p>
            </div>
            <p className="text-2xl font-semibold tabular-nums">$3,740</p>
          </div>
        </article>
        <p className="mt-6 text-sm leading-relaxed text-slate-400">
          On a live proposal the customer can accept and sign. The crew then gets the rooms, colors, and sheens without the prices.
        </p>
      </main>
      <SiteFooter />
    </div>
  )
}
