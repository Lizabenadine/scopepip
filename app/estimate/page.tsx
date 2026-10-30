import type { Metadata } from "next"
import { Estimator } from "@/components/estimator/estimator"

export const metadata: Metadata = {
  title: "Estimator",
}

export default function EstimatePage() {
  return <Estimator mode="new" />
}
