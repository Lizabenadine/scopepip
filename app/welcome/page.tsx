import type { Metadata } from "next"
import Link from "next/link"
import { BrandLogo } from "@/components/brand/brand-logo"
import { SiteFooter } from "@/components/marketing/site-footer"

export const metadata: Metadata = {
  title: "Welcome",
  robots: { index: false, follow: false },
}

export default function WelcomePage() {
  return (
    <div className="min-h-dvh bg-[#0B0F17] text-white">
      <header className="border-b border-white/10 bg-[#02182F]">
        <div className="mx-auto flex min-h-16 max-w-6xl items-center px-4 py-2 md:px-6">
          <BrandLogo href="/" />
        </div>
      </header>
      <main className="mx-auto max-w-2xl px-4 py-16 md:px-6">
        <p className="text-sm font-medium text-cyan-300">Subscription</p>
        <h1 className="mt-3 text-4xl font-bold tracking-tight">Welcome to ScopePipe</h1>
        <p className="mt-5 text-lg leading-relaxed text-slate-300" data-testid="welcome-message">
          Checkout finished. Sign in to open the office and keep estimating.
        </p>
        <Link
          href="/login"
          className="mt-8 inline-flex h-12 items-center justify-center rounded-full bg-cyan-500 px-5 text-sm font-semibold text-slate-950 hover:bg-cyan-400"
        >
          Sign in
        </Link>
      </main>
      <SiteFooter />
    </div>
  )
}
