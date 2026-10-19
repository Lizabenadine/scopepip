import { createSeedState, type ScopeState } from "./seed.ts"

export function createBlankState(): ScopeState {
  const state = createSeedState()
  return { ...state, clients: [], estimates: [], workOrders: [] }
}

export function createCompanyBook(companyName: string): ScopeState {
  const state = createSeedState()
  const suffix = crypto.randomUUID().replace(/-/g, "").slice(0, 8)
  const clientIds = new Map(state.clients.map((client) => [client.id, `${client.id}-${suffix}`]))
  const estimateIds = new Map(state.estimates.map((estimate) => [estimate.id, `${estimate.id}-${suffix}`]))
  return {
    ...state,
    estimateSettings: { ...state.estimateSettings, companyName: companyName.trim() },
    clients: state.clients.map((client) => ({ ...client, id: clientIds.get(client.id) ?? client.id })),
    estimates: state.estimates.map((estimate) => ({
      ...estimate,
      id: estimateIds.get(estimate.id) ?? estimate.id,
      clientId: clientIds.get(estimate.clientId) ?? estimate.clientId,
      publicToken: crypto.randomUUID().replace(/-/g, "").slice(0, 12),
    })),
    workOrders: state.workOrders.map((order) => {
      const estimateId = estimateIds.get(order.estimateId) ?? order.estimateId
      return {
        ...order,
        estimateId,
        checklist: order.checklist.map((item) =>
          item.id.startsWith(`${order.estimateId}:`)
            ? { ...item, id: `${estimateId}:${item.id.slice(order.estimateId.length + 1)}` }
            : item,
        ),
      }
    }),
  }
}
