import type { Metadata } from "next"
import { FlooringEstimator } from "@/components/flooring/flooring-estimator"

export const metadata: Metadata = {
  title: "Flooring Estimator",
  description: "Professional flooring takeoff, box counts, underlayment, and installation estimating.",
}

export default async function FlooringPage({
  searchParams,
}: {
  searchParams?: Promise<{ id?: string }>
}) {
  const params = await searchParams
  return <FlooringEstimator estimateId={params?.id} />
}
