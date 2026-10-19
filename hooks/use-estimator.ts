"use client"

import { useEffect, useState } from "react"
import { calculateEstimate, type EstimateQuote } from "@/lib/estimate/calculate"
import { selectEstimateKind } from "@/lib/estimate/kinds"
import { captureEstimateTemplate, type SavedEstimateTemplate } from "@/lib/estimate/saved-templates"
import { useScope } from "@/lib/data/store"
import { PAYMENT_METHODS } from "@/lib/defaults"
import { adjacentStage } from "@/lib/stages"
import type { Estimate, EstimateDraft, PipelineStage } from "@/lib/types"

function draftKey(id: string | null) {
  return `scopepipe.draft.${id ?? "new"}`
}

function readSession(id: string | null): EstimateDraft | null {
  try {
    const raw = sessionStorage.getItem(draftKey(id))
    if (!raw) return null
    const parsed = JSON.parse(raw) as EstimateDraft
    if (!parsed?.settings || !Array.isArray(parsed.areas) || !Array.isArray(parsed.lineItems)) {
      return null
    }
    if (id && parsed.id !== id) return null
    return parsed
  } catch {
    return null
  }
}

function fromEstimate(estimate: Estimate, clientName: string): EstimateDraft {
  return {
    id: estimate.id,
    clientId: estimate.clientId,
    clientName,
    stageId: estimate.stageId,
    title: estimate.title,
    jobAddress: estimate.jobAddress,
    estimateKind: estimate.estimateKind ?? "interior",
    areas: estimate.areas,
    areaGroups: estimate.areaGroups,
    lineItems: estimate.lineItems,
    rates: estimate.rates,
    settings: estimate.settings,
    scheduledOn: estimate.scheduledOn,
    notes: estimate.notes,
    crewNote: estimate.crewNote,
    acceptedAt: estimate.acceptedAt,
    publicToken: estimate.publicToken,
    clientStatus: estimate.clientStatus,
    signature: estimate.signature,
    paymentStatus: estimate.paymentStatus,
    depositReceipt: estimate.depositReceipt,
    createdAt: estimate.createdAt,
  }
}

function buildInitialDraft(
  scope: ReturnType<typeof useScope>,
  mode: "new" | "edit",
  estimateId: string | undefined,
): { draft: EstimateDraft | null; missing: boolean } {
  if (mode === "edit") {
    const estimate = scope.estimates.find((item) => item.id === estimateId)
    if (!estimate || !estimateId) return { draft: null, missing: true }
    const client = scope.clientById(estimate.clientId)
    return {
      missing: false,
      draft: readSession(estimate.id) ?? fromEstimate(estimate, client?.name ?? ""),
    }
  }

  const lead = scope.stages.find((stage) => stage.slug === "lead")
  return {
    missing: false,
    draft: readSession(null) ?? {
      id: null,
      clientId: null,
      clientName: "",
      stageId: lead?.id ?? scope.stages[0]?.id ?? "",
      title: "",
      jobAddress: "",
      estimateKind: "interior",
      areas: [],
      lineItems: [],
      rates: scope.productionRates.map((rate) => ({
        ...rate,
        coatRates: rate.coatRates.map((entry) => ({ ...entry })),
      })),
      settings: selectEstimateKind(scope.estimateSettings, "interior"),
      scheduledOn: null,
      notes: "",
      crewNote: "",
      acceptedAt: null,
      publicToken: "",
      clientStatus: "draft",
      signature: null,
      paymentStatus: "unpaid",
      depositReceipt: null,
      createdAt: null,
    },
  }
}

export function useEstimator(mode: "new" | "edit", estimateId?: string) {
  const scope = useScope()
  const [draft, setDraft] = useState<EstimateDraft | null>(null)
  const [missing, setMissing] = useState(false)
  const [loadedKey, setLoadedKey] = useState<string | null>(null)
  const [status, setStatus] = useState<string | null>(null)

  const loadKey = scope.ready ? `${mode}:${estimateId ?? "new"}` : null
  if (loadKey && loadKey !== loadedKey) {
    const initial = buildInitialDraft(scope, mode, estimateId)
    setLoadedKey(loadKey)
    setMissing(initial.missing)
    setDraft(initial.draft)
    setStatus(null)
  }

  useEffect(() => {
    if (!draft) return
    sessionStorage.setItem(draftKey(draft.id), JSON.stringify(draft))
  }, [draft])

  const quote: EstimateQuote | null = draft
    ? calculateEstimate({
        areas: draft.areas,
        lineItems: draft.lineItems,
        rates: draft.rates,
        settings: draft.settings,
        paymentMethods: PAYMENT_METHODS,
      })
    : null

  const stage = draft ? scope.stageById(draft.stageId) : undefined
  const next = draft ? adjacentStage(scope.stages, draft.stageId, 1) : null
  const previous = draft ? adjacentStage(scope.stages, draft.stageId, -1) : null
  const nameMissing = !draft || draft.clientName.trim().length === 0
  const emptyScope = !quote || (quote.areas.every((area) => area.surfaces.length === 0) && quote.lineItems.length === 0)
  const disabled = nameMissing || emptyScope
  const disabledReason = nameMissing
    ? "Add a client name before saving."
    : emptyScope
      ? "Add an area or a line item."
      : null

  const patch = (partial: Partial<EstimateDraft>) => {
    setStatus(null)
    setDraft((current) => (current ? { ...current, ...partial } : current))
  }

  const persist = () => {
    if (!draft) return null
    const saved = scope.saveEstimate(draft)
    sessionStorage.removeItem(draftKey(draft.id))
    sessionStorage.removeItem(draftKey(null))
    setDraft({
      ...draft,
      id: saved.id,
      clientId: saved.clientId,
      createdAt: draft.createdAt ?? new Date().toISOString(),
    })
    setStatus("Saved")
    return saved
  }

  return {
    ready: scope.ready && loadKey === loadedKey && (Boolean(draft) || missing),
    missing,
    draft,
    quote,
    stage: stage as PipelineStage | undefined,
    next,
    previous,
    disabled,
    disabledReason,
    status,
    clients: scope.clients,
    patch,
    persist,
    setStatus,
    moveStage: scope.moveStage,
    deleteEstimate: scope.deleteEstimate,
    paymentMethods: PAYMENT_METHODS,
    productionRates: scope.productionRates,
    savedTemplates: scope.savedTemplates,
    saveEstimateTemplate: (name: string): SavedEstimateTemplate | null => {
      if (!draft) return null
      const template = captureEstimateTemplate({
        name,
        kind: draft.estimateKind ?? "interior",
        title: draft.title,
        areas: draft.areas,
        areaGroups: draft.areaGroups,
        lineItems: draft.lineItems,
      })
      if (!template) return null
      scope.saveEstimateTemplate(template)
      setStatus("Saved as a template")
      return template
    },
    deleteEstimateTemplate: scope.deleteEstimateTemplate,
    areaNames: scope.areaNames,
    setAreaNames: scope.setAreaNames,
  }
}
