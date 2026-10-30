import type { Metadata } from "next"
import { Estimator } from "@/components/estimator/estimator"

export const metadata: Metadata = {
  title: "New estimate",
}

export default function NewEstimatePage() {
  return <Estimator mode="new" />
}
