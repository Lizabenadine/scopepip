"use client"

import { useScope } from "@/lib/data/store"
import { dispatchJobs } from "@/lib/dispatch/board"
import { SCOPE_VERSION, type ScopeState } from "@/lib/data/seed"

export function useDispatchBoard() {
  const scope = useScope()
  const state: ScopeState = {
    version: SCOPE_VERSION,
    clients: scope.clients,
    stages: scope.stages,
    estimates: scope.estimates,
    workOrders: scope.workOrders,
    crews: scope.crews,
    productionRates: scope.productionRates,
    estimateSettings: scope.estimateSettings,
    paymentMethods: scope.paymentMethods,
  }
  return {
    ready: scope.ready,
    crews: scope.crews,
    jobs: scope.ready ? dispatchJobs(state) : [],
    assign: scope.assignWorkOrder,
  }
}
