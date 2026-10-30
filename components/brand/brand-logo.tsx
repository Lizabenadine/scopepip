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
    <Link href={href} className="inline-flex max-w-full shrink-0 items-center" data-testid="brand-logo">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/logo.png?v=2"
        alt="Scopepipe"
        width={208}
        height={56}
        className={
          compact
            ? "h-10 w-auto max-w-[10.5rem] object-contain object-left"
            : "h-12 w-auto max-w-[46vw] object-contain object-left sm:h-14 sm:max-w-[13rem]"
        }
      />
    </Link>
  )
}
