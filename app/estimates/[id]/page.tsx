import type { Metadata } from "next"
import { EstimateScreen } from "@/components/estimator/estimate-screen"

export const metadata: Metadata = {
  title: "Estimate",
}

export default async function EstimatePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return <EstimateScreen id={id} />
}
