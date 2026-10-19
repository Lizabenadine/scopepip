"use client"

import { useMemo, useState } from "react"
import { useScope } from "@/lib/data/store"
import { orderedStages } from "@/lib/stages"
import type { StageSlug } from "@/lib/types"

export function usePipeline() {
  const scope = useScope()
  const [query, setQuery] = useState("")
  const [filter, setFilter] = useState<StageSlug | "all">("all")
  const ordered = orderedStages(scope.stages)

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return scope.estimates.filter((estimate) => {
      if (!needle) return true
      const client = scope.clients.find((item) => item.id === estimate.clientId)
      const haystack = [client?.name, estimate.title, estimate.jobAddress]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
      return haystack.includes(needle)
    })
  }, [scope.estimates, scope.clients, query])

  const pipelineValue = visible.reduce(
    (sum, estimate) => sum + scope.quoteEstimate(estimate).total,
    0,
  )

  return {
    ready: scope.ready,
    ordered,
    visible,
    pipelineValue,
    query,
    setQuery,
    filter,
    setFilter,
  }
}
