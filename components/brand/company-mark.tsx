import { CompanyName } from "@/components/brand/company-name"
import { displayCompanyName } from "@/lib/brand/company"
import { displayLogoUrl } from "@/lib/brand/logo"
import { cn } from "@/lib/utils"

export function CompanyMark({
  name,
  logoUrl,
  className,
  imageClassName,
  testId,
}: {
  name?: string | null
  logoUrl?: string | null
  className?: string
  imageClassName?: string
  testId?: string
}) {
  const src = displayLogoUrl(logoUrl)
  const label = displayCompanyName(name)
  if (!src) return <CompanyName name={label} className={className} testId={testId} />
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={label} data-testid={testId} className={cn("h-12 w-auto max-w-[240px] object-contain", imageClassName)} />
  )
}
