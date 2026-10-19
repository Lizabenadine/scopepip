import Link from "next/link"

export function BrandLogo() {
  return (
    <Link href="/" className="block shrink-0" data-testid="brand-logo">
      <img
        src="/scopepipe-logo.png"
        alt="ScopePipe - Painting CRM & Estimating"
        className="h-14 w-auto object-contain"
      />
    </Link>
  )
}
