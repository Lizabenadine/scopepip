"use client"

import { Estimator } from "@/components/estimator/estimator"

export function EstimateScreen({ id }: { id: string }) {
  return <Estimator mode="edit" estimateId={id} />
}
