import { companyBySlug } from "@/lib/auth/directory"

export const runtime = "nodejs"

export async function GET(_request: Request, context: { params: Promise<{ slug: string }> }) {
  const { slug } = await context.params
  if (!/^[a-z0-9-]{1,48}$/.test(slug)) return Response.json({ reason: "This request link is not valid." }, { status: 404 })
  const company = await companyBySlug(slug)
  if (!company) return Response.json({ reason: "This request link is not valid." }, { status: 404 })
  return Response.json({ name: company.name, slug: company.slug })
}
