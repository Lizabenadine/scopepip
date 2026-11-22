import type { Metadata } from "next"
import { DrywallEstimator } from "@/components/drywall/drywall-estimator"

export const metadata: Metadata = {
  title: "Drywall Estimator",
  description: "Professional drywall takeoff, sheet counts, joint compound, and Level 0–5 finishing estimating.",
}

export default function DrywallPage() {
  return <DrywallEstimator />
}
