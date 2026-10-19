import { DEFAULT_COMPANY_NAME, displayCompanyName } from "@/lib/brand/company"
import { cn } from "@/lib/utils"

export function CompanyName({
  name,
  className,
  testId,
}: {
  name?: string | null
  className?: string
  testId?: string
}) {
  const label = displayCompanyName(name)
  return (
    <span data-testid={testId} className={cn(className)}>
      {label === DEFAULT_COMPANY_NAME ? (
        <>
          Scope<span className="text-primary">Pipe</span>
        </>
      ) : (
        label
      )}
    </span>
  )
}
