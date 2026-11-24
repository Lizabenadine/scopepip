import type { ReactNode } from "react"
import Link from "next/link"

export const LOGO_HEADER_COLOR = "#02182F"

export function LogoHeader({ children }: { children?: ReactNode }) {
  return (
    <header className="bg-[#02182F] px-4 py-3 print:hidden md:px-6">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
        <BrandLogo href="/" />
        {children}
      </div>
    </header>
  )
}

export function BrandLogo({
  href = "/",
  compact = false,
}: {
  href?: string
  compact?: boolean
}) {
  return (
    <Link href={href} className="inline-flex shrink-0 items-center" data-testid="brand-logo">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/scopepipe-multi-trade-wordmark.png"
        alt="Scopepipe Contractor CRM & Estimating"
        width={240}
        height={87}
        className={
          compact
            ? "h-auto w-[180px] sm:w-[240px] max-w-full object-contain object-left"
            : "h-auto w-[180px] sm:w-[240px] max-w-full object-contain object-left"
        }
      />
    </Link>
  )
}
