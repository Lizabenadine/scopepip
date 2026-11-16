import type { Metadata } from "next"
import Link from "next/link"
import { BrandLogo } from "@/components/brand/brand-logo"
import { SiteFooter } from "@/components/marketing/site-footer"
import { UserGuide } from "@/components/marketing/user-guide"

export const metadata: Metadata = {
  title: "Help Center • Scopepipe User Guides",
  description:
    "Comprehensive guides for Scopepipe: room estimating, proposals, Sketch & Notes, voice notes, paint buy lists, sales pipeline, Spanish crew sheets, team management, and billing.",
}

export default function HelpPage() {
  return (
    <div className="min-h-dvh bg-background text-foreground flex flex-col">
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-white/10 bg-[#02182F] px-4 py-3 text-white md:px-6">
        <BrandLogo href="/" compact />
        <div className="flex items-center gap-3 text-sm">
          <Link href="/dashboard" className="text-slate-200 hover:text-white">
            Dashboard
          </Link>
          <Link href="/pricing" className="text-slate-200 hover:text-white">
            Pricing
          </Link>
          <Link href="/login" className="text-slate-200 hover:text-white">
            Sign in
          </Link>
          <Link
            href="/signup"
            className="rounded-lg bg-cyan-500 px-3 py-1.5 font-semibold text-slate-950 hover:bg-cyan-400"
          >
            Start Free Trial
          </Link>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 md:px-8">
        <UserGuide />
      </main>
      <SiteFooter />
    </div>
  )
}
