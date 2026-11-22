import type { Metadata } from "next"
import { FlooringEstimator } from "@/components/flooring/flooring-estimator"

export const metadata: Metadata = {
  title: "Flooring Estimator",
  description: "Professional flooring takeoff, box counts, underlayment, and installation estimating.",
}

export default function FlooringPage() {
  return <FlooringEstimator />
}
