"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { MessageSquare } from "lucide-react"

function proposalTokenFromPath(pathname: string): { token: string; isSubpage: boolean } | null {
  const payMatch = /^\/p\/([^/]+)\/pay\/?$/i.exec(pathname)
  if (payMatch?.[1]) return { token: payMatch[1], isSubpage: true }
  const proposalMatch = /^\/p\/([^/]+)\/?$/i.exec(pathname)
  if (proposalMatch?.[1]) return { token: proposalMatch[1], isSubpage: false }
  const bookMatch = /^\/book\/([^/]+)\/?$/i.exec(pathname)
  if (bookMatch?.[1]) return { token: bookMatch[1], isSubpage: true }
  return null
}

/**
 * Isolated customer-only chrome for proposal, walkthrough booking, and client payment links.
 * Never renders contractor navigation, dashboard links, sidebars, or marketing site links.
 */
export function ClientProposalShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const info = proposalTokenFromPath(pathname)

  const logoContent = (
    <span className="inline-flex max-w-full shrink-0 items-center gap-2.5" data-testid="client-brand-logo">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/logo.png?v=2"
        alt="Scopepipe"
        width={180}
        height={48}
        className="h-9 w-auto max-w-[10.5rem] object-contain object-left sm:h-10"
      />
    </span>
  )

  return (
    <div className="min-h-dvh overflow-x-hidden bg-background text-foreground" data-testid="client-proposal-shell">
      <header className="border-b border-white/10 bg-[#02182F] px-4 py-3 text-white print:hidden md:px-6">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3">
          {info?.isSubpage ? (
            <Link
              href={`/p/${encodeURIComponent(info.token)}`}
              aria-label="Return to your proposal"
              className="inline-flex items-center"
            >
              {logoContent}
            </Link>
          ) : (
            <div aria-label="Scopepipe">{logoContent}</div>
          )}
          {info && !info.isSubpage ? (
            <a
              href="#proposal-questions"
              data-testid="header-contact-contractor"
              className="inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-white/20 sm:text-sm"
            >
              <MessageSquare className="size-3.5 shrink-0" aria-hidden="true" />
              <span>Questions?</span>
            </a>
          ) : info ? (
            <Link
              href={`/p/${encodeURIComponent(info.token)}`}
              data-testid="header-back-to-proposal"
              className="inline-flex min-h-9 shrink-0 items-center rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-white/20 sm:text-sm"
            >
              View proposal
            </Link>
          ) : null}
        </div>
      </header>
      <main className="mx-auto w-full max-w-3xl px-4 py-6 pb-24 md:px-8 md:py-10">{children}</main>
    </div>
  )
}
