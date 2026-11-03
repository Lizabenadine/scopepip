import Link from "next/link"
import { BrandLogo } from "@/components/brand/brand-logo"
import { SiteFooter } from "@/components/marketing/site-footer"
import { ArrowRight } from "lucide-react"

export function ProductPage({
  kicker,
  title,
  lede,
  sections,
}: {
  kicker: string
  title: string
  lede: string
  sections: { heading: string; body: string }[]
}) {
  return (
    <div className="min-h-dvh bg-[#0B0F17] text-white">
      <header className="border-b border-white/10 bg-[#02182F]">
        <div className="mx-auto flex min-h-16 max-w-6xl items-center justify-between gap-4 px-4 py-2 md:px-6">
          <BrandLogo href="/" />
          <div className="flex items-center gap-4">
            <Link href="/login" className="text-sm font-medium text-slate-300 hover:text-white">
              Sign In
            </Link>
            <Link
              href="/signup"
              className="rounded-full bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-cyan-400"
            >
              Start 14-Day Free Trial
            </Link>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-12 md:px-6 md:py-16">
        <p className="text-sm font-medium text-cyan-300">{kicker}</p>
        <h1 className="mt-3 text-4xl font-bold tracking-tight md:text-5xl">{title}</h1>
        <p className="mt-5 text-lg leading-relaxed text-slate-300">{lede}</p>
        <div className="mt-10 space-y-8">
          {sections.map((section) => (
            <section key={section.heading}>
              <h2 className="text-2xl font-semibold tracking-tight">{section.heading}</h2>
              <p className="mt-3 text-base leading-relaxed text-slate-300">{section.body}</p>
            </section>
          ))}
        </div>
        <Link
          href="/signup"
          className="mt-12 inline-flex items-center gap-2 rounded-full bg-cyan-400 px-6 py-3 text-sm font-semibold text-slate-950 hover:bg-cyan-300"
        >
          Start 14-Day Free Trial
          <ArrowRight className="size-4" aria-hidden="true" />
        </Link>
      </main>
      <SiteFooter />
    </div>
  )
}
