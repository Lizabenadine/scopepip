export function slugifyCompanyName(name: string): string {
  const base = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40)
  return base || "company"
}

export function matchCompanySlug<T extends { slug: string; name: string }>(companies: T[], slug: string): T | null {
  const wanted = slug.trim().toLowerCase()
  if (!/^[a-z0-9-]{1,48}$/.test(wanted)) return null
  const exact = companies.find((company) => company.slug.toLowerCase() === wanted)
  if (exact) return exact
  const named = companies.filter((company) => slugifyCompanyName(company.name) === wanted)
  return named.length === 1 ? named[0] : null
}

export function publicCompanySlug<T extends { slug: string; name: string }>(
  company: T,
  companies: readonly T[] = [company],
): string {
  const named = slugifyCompanyName(company.name)
  if (!named) return company.slug
  const match = matchCompanySlug([...companies], named)
  if (match?.slug === company.slug) return named
  return company.slug
}
