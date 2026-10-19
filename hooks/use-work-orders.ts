"use client"

import { useScope } from "@/lib/data/store"
import { displayCompanyName } from "@/lib/brand/company"
import { crewSheetAllowed, toCrewSheet, type CrewSheet } from "@/lib/work-orders/crew-sheet"
import { toSubcontractorOrder, type WorkOrderData } from "@/lib/work-orders/subcontractor"
import type { WorkOrder } from "@/lib/types"

export function useWorkOrders(estimateId: string) {
  const scope = useScope()

  const estimate = scope.estimates.find((item) => item.id === estimateId)
  const stored = scope.workOrders.find((order) => order.estimateId === estimateId)
  const stage = estimate ? scope.stageById(estimate.stageId) : undefined
  const scheduled = crewSheetAllowed(stage?.slug)

  let sheet: CrewSheet | null = null
  if (estimate && stored && scheduled) {
    sheet = toCrewSheet(estimate, scope.clientById(estimate.clientId), stored)
  }

  const crewLead = stored?.assignedCrewId
    ? scope.crews.find((crew) => crew.id === stored.assignedCrewId)
    : undefined

  const packet: WorkOrderData | null =
    estimate && sheet
      ? toSubcontractorOrder({
          sheet,
          jobId: estimate.id,
          dateGenerated: stored?.notifiedAt ?? estimate.updatedAt,
          companyName: displayCompanyName(scope.estimateSettings.companyName),
          companyAddress: "",
          companyPhone: "",
          salespersonName: estimate.salesperson ?? "",
          salespersonEmail: scope.estimateSettings.companyEmail?.trim() ?? "",
          companyCamUrl: stored?.companyCamProjectUrl || stored?.companyCamUrl,
          exclusions: stored?.exclusions,
          subSignature: stored?.subSignature,
          subSignedDate: stored?.subSignedDate,
        })
      : null

  return {
    ready: scope.ready,
    missing: scope.ready && !estimate,
    unscheduled: scope.ready && Boolean(estimate) && !scheduled,
    blocked: scope.ready && Boolean(estimate) && scheduled && !stored,
    sheet,
    packet,
    crewName: crewLead?.name ?? null,
    onSite: stored?.status === "in_progress",
    toggleChecklist: (itemId: string) => scope.toggleChecklist(estimateId, itemId),
    setPrepNotes: (prepNotes: string) => scope.updatePrepNotes(estimateId, prepNotes),
    setHourDisplay: (hourDisplay: WorkOrder["hourDisplay"]) =>
      scope.setHourDisplay(estimateId, hourDisplay),
    signSubcontractor: (name: string, signedDate: string) =>
      scope.signSubcontractorCopy(estimateId, name, signedDate),
  }
}
