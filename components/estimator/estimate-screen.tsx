"use client"

import { useScope } from "@/lib/data/store"
import { Estimator } from "@/components/estimator/estimator"
import { FlooringEstimator } from "@/components/flooring/flooring-estimator"
import { DrywallEstimator } from "@/components/drywall/drywall-estimator"

export function EstimateScreen({ id }: { id: string }) {
  const { estimates } = useScope()
  const est = estimates.find((e) => e.id === id)

  if (est?.primaryTrade === "flooring") {
    return <FlooringEstimator estimateId={id} initialScope={est.flooringScope} />
  }

  if (est?.primaryTrade === "drywall") {
    return <DrywallEstimator estimateId={id} initialScope={est.drywallScope} />
  }

  return <Estimator mode="edit" estimateId={id} />
}
