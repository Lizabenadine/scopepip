import { redirect } from "next/navigation"

export default async function LegacyEstimatePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  redirect(`/estimates/${id}`)
}
