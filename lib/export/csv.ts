import type { ScopeState } from "../data/seed.ts"
import type { Estimate } from "../types.ts"
import { calculateEstimate } from "../estimate/calculate.ts"
import { quoteRates } from "../estimate/substrate.ts"

function escapeCell(value: unknown): string {
  if (value === null || value === undefined) return ""
  const str = String(value).trim()
  if (/[",\n\r]/.test(str)) {
    return `"${str.replaceAll('"', '""')}"`
  }
  return str
}

function toCsv(headers: string[], rows: (string | number | undefined | null)[][]): string {
  const headerLine = headers.map(escapeCell).join(",")
  const dataLines = rows.map((row) => row.map(escapeCell).join(","))
  return `\uFEFF${[headerLine, ...dataLines].join("\r\n")}\r\n`
}

function estimateTotal(estimate: Estimate, state: ScopeState): number {
  try {
    const calc = calculateEstimate({
      areas: estimate.areas,
      lineItems: estimate.lineItems,
      rates: quoteRates(estimate.rates, state.productionRates, estimate.areas),
      settings: estimate.settings,
      paymentMethods: state.paymentMethods,
    })
    return calc.total
  } catch {
    return 0
  }
}

export function leadsCsv(state: ScopeState): string {
  const headers = ["Lead Name", "Email", "Phone", "Address", "Stage", "Project Title", "Created Date"]
  const rows: (string | number)[][] = []

  for (const client of state.clients) {
    const clientEstimates = state.estimates.filter((e) => e.clientId === client.id)
    if (clientEstimates.length === 0) {
      rows.push([
        client.name,
        client.email || "",
        client.phone || "",
        client.address || "",
        "New Lead",
        "",
        (client.createdAt || "").slice(0, 10),
      ])
    } else {
      for (const est of clientEstimates) {
        const stage = state.stages.find((s) => s.id === est.stageId)?.name || est.clientStatus
        rows.push([
          client.name,
          client.email || "",
          client.phone || "",
          est.jobAddress || client.address || "",
          stage,
          est.title,
          est.createdAt.slice(0, 10),
        ])
      }
    }
  }

  return toCsv(headers, rows)
}

export function customersCsv(state: ScopeState): string {
  const headers = ["Customer Name", "Email", "Phone", "Address", "Total Projects", "Total Value", "First Contact"]
  const rows: (string | number)[][] = []

  for (const client of state.clients) {
    const estimates = state.estimates.filter((e) => e.clientId === client.id)
    const totalValue = estimates.reduce((sum, e) => sum + estimateTotal(e, state), 0)
    rows.push([
      client.name,
      client.email || "",
      client.phone || "",
      client.address || "",
      estimates.length,
      totalValue.toFixed(2),
      (client.createdAt || "").slice(0, 10),
    ])
  }

  return toCsv(headers, rows)
}

export function estimatesCsv(state: ScopeState): string {
  const headers = ["Estimate ID", "Customer", "Email", "Phone", "Project Title", "Job Address", "Stage", "Status", "Total", "Created", "Updated"]
  const rows: (string | number)[][] = []

  for (const est of state.estimates) {
    const client = state.clients.find((c) => c.id === est.clientId)
    const stage = state.stages.find((s) => s.id === est.stageId)?.name || ""
    const total = estimateTotal(est, state)
    rows.push([
      est.id,
      client?.name || "",
      client?.email || "",
      client?.phone || "",
      est.title,
      est.jobAddress,
      stage,
      est.clientStatus,
      total.toFixed(2),
      est.createdAt.slice(0, 10),
      est.updatedAt.slice(0, 10),
    ])
  }

  return toCsv(headers, rows)
}

export function jobsCsvExport(state: ScopeState): string {
  const headers = ["Work Order Estimate", "Customer", "Phone", "Job Title", "Address", "Work Status", "Scheduled Start", "Total Amount"]
  const rows: (string | number)[][] = []

  for (const order of state.workOrders) {
    const est = state.estimates.find((e) => e.id === order.estimateId)
    const client = est ? state.clients.find((c) => c.id === est.clientId) : undefined
    const total = est ? estimateTotal(est, state) : 0
    rows.push([
      order.estimateId,
      client?.name || "",
      client?.phone || "",
      est?.title || "",
      est?.jobAddress || "",
      order.status,
      order.scheduledStartDate ? order.scheduledStartDate.slice(0, 10) : "",
      total.toFixed(2),
    ])
  }

  return toCsv(headers, rows)
}

export function exportScopeCsv(
  type: "leads" | "customers" | "estimates" | "jobs",
  state: ScopeState,
): { filename: string; content: string } {
  const today = new Date().toISOString().slice(0, 10)
  switch (type) {
    case "leads":
      return { filename: `scopepipe-leads-${today}.csv`, content: leadsCsv(state) }
    case "customers":
      return { filename: `scopepipe-customers-${today}.csv`, content: customersCsv(state) }
    case "estimates":
      return { filename: `scopepipe-estimates-${today}.csv`, content: estimatesCsv(state) }
    case "jobs":
      return { filename: `scopepipe-jobs-${today}.csv`, content: jobsCsvExport(state) }
  }
}
