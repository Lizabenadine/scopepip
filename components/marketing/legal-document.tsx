import type { ReactNode } from "react"
import { LogoHeader } from "@/components/brand/brand-logo"
import { SiteFooter } from "@/components/marketing/site-footer"

export function LegalDocument({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="min-h-dvh bg-[#0B0F17] text-slate-300">
      <LogoHeader />
      <main className="mx-auto max-w-3xl px-4 py-10 md:px-6">
        <h1 className="text-4xl font-bold tracking-tight text-white">{title}</h1>
        <p className="mt-2 text-sm text-slate-500">Last updated October 29, 2026</p>
        <div className="mt-8 space-y-8 text-sm leading-relaxed">{children}</div>
      </main>
      <SiteFooter />
    </div>
  )
}

export function LegalSection({ heading, children }: { heading: string; children: ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="text-lg font-semibold text-white">{heading}</h2>
      {children}
    </section>
  )
}
