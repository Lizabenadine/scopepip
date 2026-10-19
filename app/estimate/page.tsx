import type { Metadata } from "next"
import { Estimator } from "@/components/estimator/estimator"
import { LaborSchedule } from "@/components/estimator/labor-schedule"

export const metadata: Metadata = {
  title: "Estimator",
}

export default function EstimatePage() {
  return (
    <div className="flex flex-col gap-10">
      <Estimator mode="new" />
      <LaborSchedule />
    </div>
  )
}
