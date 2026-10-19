export const DEFAULT_COMPANY_NAME = "ScopePipe"

/** Painter-facing name. A blank org profile stays on the product name. */
export function displayCompanyName(value: string | null | undefined): string {
  const trimmed = value?.trim() ?? ""
  return trimmed || DEFAULT_COMPANY_NAME
}
