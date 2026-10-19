import type { Metadata } from "next"
import { Estimator } from "@/components/estimator/estimator"
import { LaborSchedule } from "@/components/estimator/labor-schedule"

export const metadata: Metadata = {
  title: "New estimate",
}

export default function NewEstimatePage() {
  return (
    <div className="flex flex-col gap-10">
      <Estimator mode="new" />
      <LaborSchedule />
    </div>
  )
}
