"use client"

import { createContext, useContext, useEffect, useMemo, useSyncExternalStore } from "react"
import { calculateEstimate, type EstimateQuote } from "@/lib/estimate/calculate"
import type { SavedEstimateTemplate } from "@/lib/estimate/saved-templates"
import { DEFAULT_AREA_NAMES, type AreaName } from "@/lib/estimate/area-names"
import { readBrowserBook, saveBrowserBook } from "@/lib/auth/browser-book"
import type { OfficeSession } from "@/lib/auth/session"
import { createBlankState, createCompanyBook } from "@/lib/data/company-book"
import { isScopeState, type ScopeState } from "@/lib/data/seed"
import { ensureSubstrateRates, quoteRates } from "@/lib/estimate/substrate"
import { applyAssignment, workOrderForStage } from "@/lib/dispatch/assign"
import { nextSalesStage, salesStageOf } from "@/lib/pipeline/board"
import { subscribeDispatch, syncAssignment } from "@/lib/dispatch/sync"
import { cloudWorkOrder, deleteSyncedEstimate, mergeCloud, pullCloud, syncSavedEstimate } from "@/lib/supabase/sync"
import { applyDeposit } from "@/lib/payments/apply-deposit"
import { readCompanyProfile, saveCompanyProfile } from "@/lib/brand/profile"
import { applyChangeOrder } from "@/lib/change-orders/apply"
import { signPendingWork } from "@/lib/estimate/pending"
import { postProposalMessage } from "@/lib/proposals/chat"
import { syncChangeOrder } from "@/lib/change-orders/sync"
import { applyAcceptance, type AcceptanceInput } from "@/lib/proposals/accept"
import { syncAcceptance } from "@/lib/proposals/sync"
import { createWorkOrder } from "@/lib/work-orders/defaults"
import { subcontractorSignature } from "@/lib/work-orders/subcontractor"
import { appendNote, recordStageChanges } from "@/lib/clients/activity"
import { visitStartInstant } from "@/lib/appointments/visit"
import { reconcileFollowUps, resolveSequences, stopForReply, stopPursuit, collectDueFollowUps } from "@/lib/follow-ups/schedule"
import type { DueFollowUp, FollowUpMessage, FollowUpSequence } from "@/lib/follow-ups/types"
import { applyPublicBooking, type PublicBooking } from "@/lib/bookings/apply"
import { applyProposalEvent } from "@/lib/proposals/opens"
import type { ProposalEngagementEvent } from "@/lib/proposals/engagement"
import { JOB_PIPELINE_STAGES, SALES_STAGES, type SalesStage } from "@/lib/types"
import { applyInboundLead } from "@/lib/leads/apply"
import type { InboundLead } from "@/lib/leads/types"
import { applyAssignUnmatched, applyCustomerReply, applyInbound, applyOutbound, dealForClient, markOutboundDelivery, type InboundText } from "@/lib/messages/thread"
import type {
  Client,
  Estimate,
  EstimateDraft,
  EstimateSettings,
  PaymentMethod,
  PipelineStage,
  ProductionRate,
  CrewLead,
  DepositReceipt,
  DispatchStatus,
  ChangeOrder,
  CustomColumn,
  LineItemInput,
  SitePhoto,
  TextMessage,
  WorkOrder,
} from "@/lib/types"

interface Snapshot {
  state: ScopeState
  notice: string | null
  ready: boolean
  session: OfficeSession | null
}

function clearSessionDrafts() {
  const keys: string[] = []
  for (let index = 0; index < sessionStorage.length; index += 1) {
    const key = sessionStorage.key(index)
    if (key?.startsWith("scopepipe.draft.")) keys.push(key)
  }
  keys.forEach((key) => sessionStorage.removeItem(key))
}

const SERVER_SNAPSHOT: Snapshot = {
  state: createBlankState(),
  notice: null,
  ready: false,
  session: null,
}

let current: Snapshot = SERVER_SNAPSHOT
let bootstrapped = false
let officeSession: OfficeSession | null = null
let bookRevision = 0
let saving = false
let dirty = false
const listeners = new Set<() => void>()

function emit() {
  for (const listener of listeners) listener()
}

function commit(state: ScopeState, notice: string | null = current.notice, options?: { sync?: boolean }) {
  const previous = current.state
  current = { state, notice, ready: true, session: officeSession }
  persist(state)
  emit()
  if (options?.sync === false || !officeSession) return
  void pushEstimateChanges(previous, state)
}

function syncShape(estimate: Estimate): string {
  const copy = { ...estimate }
  delete copy.followUp
  delete copy.followUpLog
  return JSON.stringify(copy)
}

function clientContact(client: Client | undefined): string {
  if (!client) return ""
  return [client.name, client.phone, client.email, client.address].join("\u0000")
}

function markSyncNotice() {
  if (current.notice) return
  current = {
    ...current,
    notice: "Saved on this account. Supabase did not take the latest estimate.",
  }
  emit()
}

async function pushEstimateChanges(previous: ScopeState, next: ScopeState) {
  const companyId = officeSession?.companyId
  if (!companyId) return
  const priorEstimates = new Map(previous.estimates.map((estimate) => [estimate.id, estimate]))
  const priorClients = new Map(previous.clients.map((client) => [client.id, client]))
  const jobs: Promise<void>[] = []
  for (const estimate of next.estimates) {
    const prior = priorEstimates.get(estimate.id)
    const client = next.clients.find((item) => item.id === estimate.clientId)
    const contactChanged = clientContact(priorClients.get(estimate.clientId)) !== clientContact(client)
    const estimateChanged = !prior || syncShape(prior) !== syncShape(estimate)
    const order = next.workOrders.find((item) => item.estimateId === estimate.id)
    const priorOrder = previous.workOrders.find((item) => item.estimateId === estimate.id)
    const orderChanged = JSON.stringify(order ? cloudWorkOrder(order) : null) !== JSON.stringify(priorOrder ? cloudWorkOrder(priorOrder) : null)
    if (!estimateChanged && !contactChanged && !orderChanged) continue
    if (!client) continue
    const quote = calculateEstimate({
      areas: estimate.areas,
      lineItems: estimate.lineItems,
      rates: estimate.rates,
      settings: estimate.settings,
      paymentMethods: next.paymentMethods,
    })
    jobs.push(
      syncSavedEstimate({
        companyId,
        client,
        estimate,
        quote,
        workOrder: order ? cloudWorkOrder(order) : null,
      }).catch(() => {
        markSyncNotice()
      }),
    )
  }
  for (const estimate of previous.estimates) {
    if (next.estimates.some((item) => item.id === estimate.id)) continue
    jobs.push(
      deleteSyncedEstimate(companyId, estimate.id).catch(() => {
        markSyncNotice()
      }),
    )
  }
  await Promise.all(jobs)
}

function withBookSubstrates(state: ScopeState): ScopeState {
  const productionRates = ensureSubstrateRates(state.productionRates)
  if (productionRates === state.productionRates) return state
  return { ...state, productionRates }
}

function persist(state: ScopeState) {
  if (!officeSession) return
  void state
  dirty = true
  if (!saving) void pumpBook()
}

async function pumpBook() {
  saving = true
  while (dirty && officeSession) {
    dirty = false
    const state = getSnapshot().state
    const revision = bookRevision
    if (officeSession) saveBrowserBook(officeSession.companyId, revision, state)
    try {
      const response = await fetch("/api/account/book", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ revision, state }),
      })
      if (response.status === 409) {
        const fresh = (await response.json()) as { revision?: number; state?: unknown }
        if (typeof fresh.revision === "number" && isScopeState(fresh.state)) {
          bookRevision = fresh.revision
          current = {
            state: fresh.state,
            notice: "This book was updated somewhere else. The latest copy is showing.",
            ready: true,
            session: officeSession,
          }
          emit()
        }
        dirty = false
        break
      }
      if (response.ok) {
        const saved = (await response.json()) as { revision?: number }
        if (typeof saved.revision === "number") bookRevision = saved.revision
      } else if (response.status !== 409) {
        dirty = false
        break
      }
    } catch {
      dirty = false
      break
    }
  }
  saving = false
}

async function loadOfficeBook() {
  if (!officeSession) return
  const response = await fetch("/api/account/book")
  if (!response.ok) {
    const cached = readBrowserBook(officeSession.companyId)
    const state = withBookSubstrates(cached?.state ?? createCompanyBook(officeSession.companyName))
    bookRevision = cached?.revision ?? 1
    if (!cached) saveBrowserBook(officeSession.companyId, bookRevision, state)
    current = { state, notice: null, ready: true, session: officeSession }
    emit()
    return
  }
  const payload = (await response.json()) as { revision?: number; state?: unknown }
  if (typeof payload.revision !== "number" || !isScopeState(payload.state)) {
    current = {
      state: createBlankState(),
      notice: "This account's jobs could not be read.",
      ready: true,
      session: officeSession,
    }
    emit()
    return
  }
  bookRevision = payload.revision
  let state = withBookSubstrates(payload.state)
  const cloud = await pullCloud().catch(() => null)
  if (cloud) {
    const merged = mergeCloud(state, cloud)
    if (merged.changed) state = merged.state
  }
  current = { state, notice: null, ready: true, session: officeSession }
  if (state !== payload.state) persist(state)
  emit()
}

async function bootstrap() {
  try {
    const response = await fetch("/api/auth/session")
    const payload = (await response.json()) as { user?: OfficeSession | null }
    if (!payload.user) {
      officeSession = null
      current = { state: createBlankState(), notice: null, ready: true, session: null }
      emit()
      return
    }
    officeSession = payload.user
    await loadOfficeBook()
  } catch {
    officeSession = null
    current = { state: createBlankState(), notice: "Sign-in could not be checked.", ready: true, session: null }
    emit()
  }
}

function commitReconciled(state: ScopeState, notice: string | null = current.notice) {
  const at = new Date().toISOString()
  const withStages = recordStageChanges(getSnapshot().state, state, at)
  commit(reconcileFollowUps(withStages, at), notice)
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function getSnapshot() {
  if (typeof window !== "undefined" && !bootstrapped) {
    bootstrapped = true
    void bootstrap()
  }
  return current
}

function getServerSnapshot() {
  return SERVER_SNAPSHOT
}

export interface ScopeApi {
  ready: boolean
  notice: string | null
  session: OfficeSession | null
  reloadBook: () => Promise<void>
  dismissNotice: () => void
  clients: Client[]
  stages: PipelineStage[]
  estimates: Estimate[]
  workOrders: WorkOrder[]
  crews: CrewLead[]
  productionRates: ProductionRate[]
  assignWorkOrder: (
    estimateId: string,
    patch: {
      status: DispatchStatus
      assignedCrewId: string | null
      scheduledStartDate: string | null
    },
  ) => { ok: true } | { ok: false; reason: string }
  estimateSettings: EstimateSettings
  paymentMethods: PaymentMethod[]
  clientById: (id: string) => Client | undefined
  stageById: (id: string) => PipelineStage | undefined
  quoteEstimate: (estimate: Estimate) => EstimateQuote
  saveEstimate: (draft: EstimateDraft) => { id: string; clientId: string }
  deleteEstimate: (id: string) => void
  moveStage: (id: string, stageId: string, scheduledOn?: string | null) => void
  addEstimateNote: (id: string, text: string) => void
  scheduleSalesVisit: (id: string, date: string, time: string) => void
  advanceSalesStage: (id: string) => void
  addCustomColumn: (kind: "sales" | "jobs", label: string, after: string) => { ok: true; id: string } | { ok: false; reason: string }
  renameBoardColumn: (id: string, label: string) => void
  removeCustomColumn: (id: string) => void
  placeOnColumn: (estimateId: string, columnId: string) => void
  customColumns: CustomColumn[]
  columnLabels: Record<string, string>
  setEstimateTags: (id: string, tags: string[]) => void
  archiveEstimate: (id: string) => void
  acceptEstimate: (id: string) => void
  acceptProposal: (
    token: string,
    input: Omit<AcceptanceInput, "signedAt">,
  ) => { ok: true; signedAt: string; estimateId: string } | { ok: false; reason: string }
  recordDeposit: (
    estimateId: string,
    receipt: DepositReceipt,
  ) => { ok: true } | { ok: false; reason: string }
  updateClient: (id: string, patch: Partial<Client>) => void
  deleteClient: (id: string) => { ok: true } | { ok: false; reason: string }
  updateEstimateSettings: (settings: EstimateSettings) => void
  setCoatRate: (rateId: string, coats: number, value: number) => void
  savedTemplates: SavedEstimateTemplate[]
  saveEstimateTemplate: (template: SavedEstimateTemplate) => void
  deleteEstimateTemplate: (id: string) => void
  areaNames: AreaName[]
  setAreaNames: (names: AreaName[]) => void
  followUpSequences: FollowUpSequence[]
  saveFollowUpSequences: (sequences: FollowUpSequence[]) => void
  markCustomerReply: (estimateId: string) => void
  prepareFollowUps: () => DueFollowUp[]
  recordFollowUpDelivery: (message: FollowUpMessage) => void
  holdFollowUp: (estimateId: string, minutes: number) => void
  receiveInbound: (inbound: InboundText) => { matched: boolean }
  receiveInboundLead: (lead: InboundLead) => { created: boolean }
  receivePublicBooking: (booking: PublicBooking) => { matched: boolean }
  receiveProposalEvent: (event: ProposalEngagementEvent) => { matched: boolean }
  markZapierDelivered: (ids: string[]) => void
  applyQuickBooks: (rows: { estimateId: string; quickbooksInvoiceId: string; syncedAt: string }[]) => void
  applyGoogleEvents: (rows: { uid: string; googleEventId: string }[]) => void
  applyCompanyCam: (
    rows: { estimateId: string; projectId: string; projectUrl: string; syncedAt: string; photos: { id: string; url: string; capturedAt: string }[] }[],
  ) => void
  logCustomerReply: (clientId: string, body: string, mediaUrls: string[]) => { ok: true; estimateId: string | null } | { ok: false }
  assignUnmatchedText: (messageId: string, clientId: string) => void
  appendOutboundText: (clientId: string, body: string, mediaUrls: string[]) => TextMessage | null
  markTextDelivery: (clientId: string, messageId: string, delivery: TextMessage["delivery"]) => void
  saveBusinessPhone: (phone: string) => void
  unmatchedTexts: TextMessage[]
  zapierDelivered: string[]
  resetDemo: () => void
  updatePrepNotes: (estimateId: string, prepNotes: string) => void
  setHourDisplay: (estimateId: string, hourDisplay: WorkOrder["hourDisplay"]) => void
  toggleChecklist: (estimateId: string, itemId: string) => void
  signSubcontractorCopy: (
    estimateId: string,
    name: string,
    signedDate: string,
  ) => { ok: true } | { ok: false; reason: string }
  applyChangeOrder: (
    changeOrder: ChangeOrder,
    lineItems: LineItemInput[],
  ) => { ok: true } | { ok: false; reason: string }
  applyPendingSignature: (
    estimateId: string,
    lineIds: string[],
    clientSignatureUrl: string,
  ) => { ok: true } | { ok: false; reason: string }
  postProposalChat: (estimateId: string, body: string) => { ok: true } | { ok: false; reason: string }
  applyQuickBooksCredits: (rows: { estimateId: string; creditId: string; quickbooksCreditId: string }[]) => void
  addSitePhoto: (
    estimateId: string,
    photo: Pick<SitePhoto, "caption" | "storagePath" | "url" | "tag" | "linkKind" | "linkId"> &
      Partial<Pick<SitePhoto, "id" | "createdAt">>,
  ) => void
}

const ScopeContext = createContext<ScopeApi | null>(null)

function buildApi(snapshot: Snapshot): ScopeApi {
  const { state } = snapshot

  return {
    ready: snapshot.ready,
    notice: snapshot.notice,
    session: snapshot.session,
    reloadBook: () => loadOfficeBook(),
    dismissNotice: () => {
      current = { ...current, notice: null }
      emit()
    },
    clients: state.clients,
    stages: state.stages,
    estimates: state.estimates,
    workOrders: state.workOrders,
    crews: state.crews,
    productionRates: state.productionRates,
    estimateSettings: state.estimateSettings,
    paymentMethods: state.paymentMethods,
    clientById: (id) => state.clients.find((client) => client.id === id),
    stageById: (id) => state.stages.find((stage) => stage.id === id),
    quoteEstimate: (estimate) =>
      calculateEstimate({
        areas: estimate.areas,
        lineItems: estimate.lineItems,
        rates: quoteRates(estimate.rates, state.productionRates, estimate.areas),
        settings: estimate.settings,
        paymentMethods: state.paymentMethods,
      }),
    saveEstimate: (draft) => {
      const latest = getSnapshot().state
      const id = draft.id ?? crypto.randomUUID()
      const previous = latest.estimates.find((item) => item.id === id)
      const now = new Date().toISOString()
      const clientId = draft.clientId ?? crypto.randomUUID()
      const creatingClient = draft.clientId === null

      let clients = latest.clients
      if (creatingClient) {
        clients = [
          {
            id: clientId,
            name: draft.clientName.trim(),
            phone: "",
            email: "",
            address: draft.jobAddress.trim(),
            notes: "",
            createdAt: now,
            updatedAt: now,
          },
          ...clients,
        ]
      } else {
        clients = clients.map((client) => {
          if (client.id !== clientId || client.address || !draft.jobAddress.trim()) {
            return client
          }
          return { ...client, address: draft.jobAddress.trim(), updatedAt: now }
        })
      }

      const estimate: Estimate = {
        id,
        clientId,
        stageId: draft.stageId,
        title: draft.title.trim() || "Interior repaint",
        jobAddress: draft.jobAddress.trim(),
        estimateKind: draft.estimateKind ?? previous?.estimateKind ?? "interior",
        areas: draft.areas,
        areaGroups: draft.areaGroups && draft.areaGroups.length > 0 ? draft.areaGroups : undefined,
        lineItems: draft.lineItems,
        rates: draft.rates,
        settings: draft.settings,
        scheduledOn: draft.scheduledOn,
        notes: draft.notes.trim(),
        crewNote: draft.crewNote.trim(),
        acceptedAt: draft.acceptedAt,
        declinedAt: previous?.declinedAt ?? null,
        publicToken: draft.publicToken || existingToken(latest, id),
        clientStatus: draft.clientStatus,
        signature: draft.signature,
        paymentStatus: draft.paymentStatus ?? previous?.paymentStatus ?? "unpaid",
        depositReceipt: draft.depositReceipt === undefined ? (previous?.depositReceipt ?? null) : draft.depositReceipt,
        leadSource: previous?.leadSource ?? null,
        inboundLeadId: previous?.inboundLeadId ?? null,
        tags: previous?.tags ? [...previous.tags] : [],
        salesperson: previous?.salesperson ?? "",
        salesStage: previous?.salesStage ?? null,
        boardColumnId: previous?.boardColumnId ?? null,
        archived: previous?.archived,
        changeOrders: previous?.changeOrders ? [...previous.changeOrders] : [],
        credits: previous?.credits ? [...previous.credits] : undefined,
        estimateVisitOn: previous?.estimateVisitOn ?? null,
        estimateVisitAt: previous?.estimateVisitAt ?? null,
        followUp: previous?.followUp ?? null,
        followUpLog: previous?.followUpLog ? [...previous.followUpLog] : [],
        stageChanges: previous?.stageChanges ? [...previous.stageChanges] : [],
        proposalOpens: previous?.proposalOpens ? [...previous.proposalOpens] : [],
        noteLog: previous?.noteLog ? [...previous.noteLog] : [],
        proposalMessages: previous?.proposalMessages ? [...previous.proposalMessages] : undefined,
        createdAt: draft.createdAt ?? now,
        updatedAt: now,
      }

      const estimates = latest.estimates.some((item) => item.id === id)
        ? latest.estimates.map((item) => (item.id === id ? estimate : item))
        : [estimate, ...latest.estimates]

      const workOrders = latest.workOrders.some((order) => order.estimateId === id)
        ? latest.workOrders
        : [createWorkOrder(estimate), ...latest.workOrders]

      commitReconciled({ ...latest, clients, estimates, workOrders })
      return { id, clientId }
    },
    deleteEstimate: (id) => {
      const latest = getSnapshot().state
      commit({
        ...latest,
        estimates: latest.estimates.filter((estimate) => estimate.id !== id),
        workOrders: latest.workOrders.filter((order) => order.estimateId !== id),
      })
    },
    acceptEstimate: (id) => {
      const latest = getSnapshot().state
      const signedAt = new Date().toISOString()
      const estimates = latest.estimates.map((estimate) =>
        estimate.id === id
          ? {
              ...estimate,
              clientStatus: "accepted" as const,
              acceptedAt: signedAt,
              declinedAt: null,
              updatedAt: signedAt,
            }
          : estimate,
      )
      const accepted = estimates.find((estimate) => estimate.id === id)
      const workOrders =
        accepted && !latest.workOrders.some((order) => order.estimateId === id)
          ? [createWorkOrder(accepted), ...latest.workOrders]
          : latest.workOrders
      commitReconciled({ ...latest, estimates, workOrders })
    },
    acceptProposal: (token, input) => {
      const latest = getSnapshot().state
      const signedAt = new Date().toISOString()
      const result = applyAcceptance(latest, token, { ...input, signedAt })
      if (!result.ok) return result
      commitReconciled(result.state)
      void syncAcceptance(token, { ...input, signedAt }).catch(() => undefined)
      return { ok: true, signedAt, estimateId: result.estimateId }
    },
    recordDeposit: (estimateId, receipt) => {
      const latest = getSnapshot().state
      const result = applyDeposit(latest, estimateId, receipt)
      if (!result.ok) return result
      commitReconciled(result.state)
      return { ok: true }
    },
    moveStage: (id, stageId, scheduledOn) => {
      const latest = getSnapshot().state
      const stage = latest.stages.find((item) => item.id === stageId)
      const estimates = latest.estimates.map((estimate) => {
        if (estimate.id !== id) return estimate
        return {
          ...estimate,
          stageId,
          scheduledOn: scheduledOn === undefined ? estimate.scheduledOn : scheduledOn,
          updatedAt: new Date().toISOString(),
        }
      })
      const scheduled = estimates.find((estimate) => estimate.id === id)
      const ensured =
        stage &&
        (stage.slug === "scheduled" || stage.slug === "completed") &&
        scheduled &&
        !latest.workOrders.some((order) => order.estimateId === id)
          ? [createWorkOrder(scheduled), ...latest.workOrders]
          : latest.workOrders
      const workOrders = ensured.map((order) => {
        if (order.estimateId !== id || !scheduled) return order
        const date = scheduledOn === undefined ? scheduled.scheduledOn : scheduledOn
        return workOrderForStage(order, stage?.slug, date)
      })
      commitReconciled({ ...latest, estimates, workOrders })
    },
    addEstimateNote: (id, text) => {
      const note = text.trim()
      if (!note) return
      const latest = getSnapshot().state
      const now = new Date().toISOString()
      commit({
        ...latest,
        estimates: latest.estimates.map((estimate) => {
          if (estimate.id !== id) return estimate
          const notes = estimate.notes.trim() ? `${estimate.notes.trim()}\n${note}` : note
          return appendNote({ ...estimate, notes, updatedAt: now }, note, now)
        }),
      })
    },
    advanceSalesStage: (id) => {
      const latest = getSnapshot().state
      const estimate = latest.estimates.find((item) => item.id === id)
      if (!estimate) return
      const current = salesStageOf(estimate)
      if (!current) return
      const next = nextSalesStage(current)
      if (!next) return
      const now = new Date().toISOString()
      commitReconciled({
        ...latest,
        estimates: latest.estimates.map((item) =>
          item.id === id ? { ...item, salesStage: next, boardColumnId: null, updatedAt: now } : item,
        ),
      })
    },
    addCustomColumn: (kind, label, after) => {
      const name = label.trim().slice(0, 40)
      if (!name) return { ok: false as const, reason: "Name the column." }
      const latest = getSnapshot().state
      const column: CustomColumn = { id: `col-${crypto.randomUUID().slice(0, 8)}`, kind, label: name, after }
      commit({ ...latest, customColumns: [...(latest.customColumns ?? []), column] })
      return { ok: true as const, id: column.id }
    },
    renameBoardColumn: (id, label) => {
      const name = label.trim().slice(0, 40)
      if (!name) return
      const latest = getSnapshot().state
      const custom = (latest.customColumns ?? []).find((column) => column.id === id)
      if (custom) {
        commit({
          ...latest,
          customColumns: (latest.customColumns ?? []).map((column) => (column.id === id ? { ...column, label: name } : column)),
        })
        return
      }
      commit({ ...latest, columnLabels: { ...latest.columnLabels, [id]: name } })
    },
    removeCustomColumn: (id) => {
      const latest = getSnapshot().state
      commit({
        ...latest,
        customColumns: (latest.customColumns ?? []).filter((column) => column.id !== id),
        estimates: latest.estimates.map((estimate) =>
          estimate.boardColumnId === id ? { ...estimate, boardColumnId: null } : estimate,
        ),
      })
    },
    placeOnColumn: (estimateId, columnId) => {
      const latest = getSnapshot().state
      if (!latest.estimates.some((item) => item.id === estimateId)) return
      const now = new Date().toISOString()
      const custom = (latest.customColumns ?? []).find((column) => column.id === columnId)
      if (custom) {
        commit({
          ...latest,
          estimates: latest.estimates.map((item) =>
            item.id === estimateId ? { ...item, boardColumnId: custom.id, updatedAt: now } : item,
          ),
        })
        return
      }
      if ((SALES_STAGES as readonly string[]).includes(columnId)) {
        commitReconciled({
          ...latest,
          estimates: latest.estimates.map((item) =>
            item.id === estimateId
              ? { ...item, salesStage: columnId as SalesStage, boardColumnId: null, updatedAt: now }
              : item,
          ),
        })
        return
      }
      if (!(JOB_PIPELINE_STAGES as readonly string[]).includes(columnId)) return
      const parked = latest.estimates.find((item) => item.id === estimateId)?.boardColumnId
      if (!parked) return
      commit({
        ...latest,
        estimates: latest.estimates.map((item) =>
          item.id === estimateId ? { ...item, boardColumnId: null, updatedAt: now } : item,
        ),
      })
    },
    setEstimateTags: (id, tags) => {
      const next = [...new Set(tags.map((tag) => tag.trim()).filter(Boolean))]
      const latest = getSnapshot().state
      const now = new Date().toISOString()
      commit({
        ...latest,
        estimates: latest.estimates.map((item) =>
          item.id === id ? { ...item, tags: next, updatedAt: now } : item,
        ),
      })
    },
    archiveEstimate: (id) => {
      const latest = getSnapshot().state
      const now = new Date().toISOString()
      commitReconciled({
        ...latest,
        estimates: latest.estimates.map((item) =>
          item.id === id ? { ...item, archived: true, updatedAt: now } : item,
        ),
      })
    },
    scheduleSalesVisit: (id, date, time) => {
      const instant = visitStartInstant(date, time)
      if (!instant) return
      const latest = getSnapshot().state
      const now = new Date().toISOString()
      commitReconciled({
        ...latest,
        estimates: latest.estimates.map((estimate) => {
          if (estimate.id !== id) return estimate
          const early =
            !estimate.salesStage ||
            estimate.salesStage === "cold" ||
            estimate.salesStage === "warm" ||
            estimate.salesStage === "estimate_requested"
          return {
            ...estimate,
            estimateVisitOn: date,
            estimateVisitAt: instant,
            salesStage: early ? "estimate_scheduled" : estimate.salesStage,
            followUp: stopPursuit(estimate.followUp),
            updatedAt: now,
          }
        }),
      })
    },
    assignWorkOrder: (estimateId, patch) => {
      const latest = getSnapshot().state
      const notifiedAt = new Date().toISOString()
      const result = applyAssignment(latest, { estimateId, ...patch, notifiedAt })
      if (!result.ok) {
        commitReconciled(latest, result.reason)
        return result
      }
      commitReconciled(result.state, result.notice || current.notice)
      if (result.changed) {
        void syncAssignment({ estimateId, ...patch, notifiedAt }).catch(() => undefined)
      }
      return { ok: true }
    },
    updateClient: (id, patch) => {
      const latest = getSnapshot().state
      commit({
        ...latest,
        clients: latest.clients.map((client) =>
          client.id === id
            ? { ...client, ...patch, id, updatedAt: new Date().toISOString() }
            : client,
        ),
      })
    },
    deleteClient: (id) => {
      const latest = getSnapshot().state
      const attached = latest.estimates.filter((estimate) => estimate.clientId === id)
      if (attached.length > 0) {
        return {
          ok: false as const,
          reason: `Delete ${attached.length === 1 ? "the estimate" : `${attached.length} estimates`} for this client first.`,
        }
      }
      commit({
        ...latest,
        clients: latest.clients.filter((client) => client.id !== id),
      })
      return { ok: true as const }
    },
    updateEstimateSettings: (estimateSettings) => {
      commit({ ...getSnapshot().state, estimateSettings })
      void saveCompanyProfile(estimateSettings).catch(() => undefined)
    },
    setCoatRate: (rateId, coats, value) => {
      if (!Number.isFinite(value) || value < 0 || !Number.isFinite(coats)) return
      const speed = Math.round(value * 1000) / 1000
      const count = Math.min(6, Math.max(1, Math.round(coats)))
      const latest = getSnapshot().state
      commit({
        ...latest,
        productionRates: latest.productionRates.map((rate) => {
          if (rate.id !== rateId) return rate
          const exists = rate.coatRates.some((entry) => entry.coats === count)
          const coatRates = exists
            ? rate.coatRates.map((entry) => (entry.coats === count ? { ...entry, value: speed } : entry))
            : [...rate.coatRates, { coats: count, value: speed }].sort((left, right) => left.coats - right.coats)
          return { ...rate, coatRates }
        }),
      })
    },
    savedTemplates: state.savedTemplates ?? [],
    saveEstimateTemplate: (template) => {
      const latest = getSnapshot().state
      commit({ ...latest, savedTemplates: [template, ...(latest.savedTemplates ?? [])] })
    },
    deleteEstimateTemplate: (id) => {
      const latest = getSnapshot().state
      commit({
        ...latest,
        savedTemplates: (latest.savedTemplates ?? []).filter((template) => template.id !== id),
      })
    },
    areaNames: state.areaNames ?? DEFAULT_AREA_NAMES,
    setAreaNames: (areaNames) => {
      const latest = getSnapshot().state
      commit({ ...latest, areaNames })
    },
    followUpSequences: resolveSequences(state.followUpSequences),
    saveFollowUpSequences: (sequences) => {
      const latest = getSnapshot().state
      commit({
        ...latest,
        followUpSequences: sequences.map((sequence) => ({
          ...sequence,
          steps: sequence.steps.map((step) => ({ ...step })),
        })),
      })
    },
    markCustomerReply: (estimateId) => {
      const latest = getSnapshot().state
      const now = new Date().toISOString()
      commit({
        ...latest,
        estimates: latest.estimates.map((estimate) => {
          if (estimate.id !== estimateId) return estimate
          const line = "Customer replied."
          const notes = estimate.notes.includes(line)
            ? estimate.notes
            : estimate.notes.trim()
              ? `${estimate.notes.trim()}\n${line}`
              : line
          return {
            ...estimate,
            followUp: stopForReply(estimate.followUp),
            notes,
            updatedAt: now,
          }
        }),
      })
    },
    prepareFollowUps: () => {
      const latest = getSnapshot().state
      const now = new Date()
      const next = reconcileFollowUps(latest, now.toISOString())
      if (next !== latest) commit(next)
      return collectDueFollowUps(next, now.getTime())
    },
    recordFollowUpDelivery: (message) => {
      const latest = getSnapshot().state
      const now = new Date().toISOString()
      let next: ScopeState = {
        ...latest,
        estimates: latest.estimates.map((estimate) => {
          if (estimate.id !== message.estimateId) return estimate
          const followUpLog = [...(estimate.followUpLog ?? []), message].slice(-40)
          const enrollment = estimate.followUp
          const stillActive =
            enrollment?.status === "active" && enrollment.stage === message.stage
          const followUp =
            stillActive && enrollment
              ? {
                  ...enrollment,
                  sentStepIds: enrollment.sentStepIds.includes(message.stepId)
                    ? enrollment.sentStepIds
                    : [...enrollment.sentStepIds, message.stepId],
                  holdUntil: null,
                }
              : enrollment
          return { ...estimate, followUp, followUpLog, updatedAt: now }
        }),
      }
      if (message.channel === "text" && message.delivery !== "skipped") {
        const estimate = next.estimates.find((item) => item.id === message.estimateId)
        if (estimate) {
          next = applyOutbound(next, estimate.clientId, {
            id: message.id,
            direction: "out",
            body: message.body,
            mediaUrls: [],
            createdAt: message.sentAt || now,
            estimateId: message.estimateId,
            delivery: message.delivery === "sent" ? "sent" : "logged",
          })
        }
      }
      commit(next)
    },
    receiveInbound: (inbound) => {
      const latest = getSnapshot().state
      const result = applyInbound(latest, inbound)
      if (result.state !== latest) commit(result.state)
      return { matched: result.matched }
    },
    receiveInboundLead: (lead) => {
      const latest = getSnapshot().state
      const next = applyInboundLead(latest, lead)
      if (next === latest) return { created: false }
      commitReconciled(next)
      return { created: true }
    },
    receivePublicBooking: (booking) => {
      const latest = getSnapshot().state
      const next = applyPublicBooking(latest, booking, new Date().toISOString())
      if (next === latest) return { matched: latest.estimates.some((estimate) => estimate.publicToken === booking.token) }
      commitReconciled(next)
      return { matched: true }
    },
    receiveProposalEvent: (event) => {
      const latest = getSnapshot().state
      const next = applyProposalEvent(latest, event)
      if (next === latest) return { matched: latest.estimates.some((estimate) => estimate.publicToken === event.proposalId || estimate.id === event.proposalId) }
      commit(next)
      return { matched: true }
    },
    markZapierDelivered: (ids) => {
      const latest = getSnapshot().state
      const have = new Set(latest.zapierDelivered ?? [])
      const added = ids.filter((id) => id && !have.has(id))
      if (added.length === 0) return
      commit({ ...latest, zapierDelivered: [...have, ...added].slice(-200) })
    },
    applyQuickBooks: (rows) => {
      const latest = getSnapshot().state
      const byId = new Map(rows.filter((row) => row.quickbooksInvoiceId).map((row) => [row.estimateId, row]))
      let changed = false
      const estimates = latest.estimates.map((estimate) => {
        const row = byId.get(estimate.id)
        if (!row || estimate.quickbooksInvoiceId === row.quickbooksInvoiceId) return estimate
        changed = true
        return { ...estimate, quickbooksInvoiceId: row.quickbooksInvoiceId, quickbooksSyncedAt: row.syncedAt }
      })
      if (changed) commit({ ...latest, estimates })
    },
    applyGoogleEvents: (rows) => {
      const latest = getSnapshot().state
      const visits = new Map(rows.filter((row) => row.uid.startsWith("visit-")).map((row) => [row.uid.slice("visit-".length), row.googleEventId]))
      const jobs = new Map(rows.filter((row) => row.uid.startsWith("job-")).map((row) => [row.uid.slice("job-".length), row.googleEventId]))
      let changed = false
      const estimates = latest.estimates.map((estimate) => {
        const googleEventId = visits.get(estimate.id)
        if (!googleEventId || estimate.googleEventId === googleEventId) return estimate
        changed = true
        return { ...estimate, googleEventId }
      })
      const workOrders = latest.workOrders.map((order) => {
        const googleEventId = jobs.get(order.estimateId)
        if (!googleEventId || order.googleEventId === googleEventId) return order
        changed = true
        return { ...order, googleEventId }
      })
      if (changed) commit({ ...latest, estimates, workOrders })
    },
    applyCompanyCam: (rows) => {
      const latest = getSnapshot().state
      let changed = false
      const workOrders = latest.workOrders.map((order) => {
        const update = rows.find((row) => row.estimateId === order.estimateId && row.projectId)
        if (!update) return order
        const have = new Set(order.photos.map((photo) => photo.storagePath))
        const photos = update.photos
          .filter((photo) => photo.url.startsWith("https://") && !have.has(`companycam:${photo.id}`))
          .map((photo) => ({
            id: `companycam-${photo.id}`.slice(0, 80),
            estimateId: order.estimateId,
            caption: "CompanyCam",
            tag: "in_progress" as const,
            linkKind: null,
            linkId: null,
            storagePath: `companycam:${photo.id}`,
            url: photo.url,
            createdAt: photo.capturedAt,
          }))
        if (
          photos.length === 0 &&
          order.companyCamProjectId === update.projectId &&
          order.companyCamProjectUrl === update.projectUrl
        ) {
          return order
        }
        changed = true
        return {
          ...order,
          companyCamProjectId: update.projectId,
          companyCamProjectUrl: update.projectUrl,
          companyCamSyncedAt: update.syncedAt,
          photos: [...photos, ...order.photos].slice(0, 40),
        }
      })
      if (changed) commit({ ...latest, workOrders })
    },
    logCustomerReply: (clientId, body, mediaUrls) => {
      const latest = getSnapshot().state
      const client = latest.clients.find((item) => item.id === clientId)
      if (!client || (!body.trim() && mediaUrls.length === 0)) return { ok: false as const }
      const createdAt = new Date().toISOString()
      const next = applyCustomerReply(latest, clientId, {
        id: crypto.randomUUID(),
        from: client.phone,
        body,
        mediaUrls,
        createdAt,
      })
      commit(next)
      const estimateId = next.clients.find((item) => item.id === clientId)?.messages?.at(-1)?.estimateId ?? null
      return { ok: true as const, estimateId }
    },
    assignUnmatchedText: (messageId, clientId) => {
      const latest = getSnapshot().state
      const next = applyAssignUnmatched(latest, messageId, clientId)
      if (next !== latest) commit(next)
    },
    appendOutboundText: (clientId, body, mediaUrls) => {
      const latest = getSnapshot().state
      const client = latest.clients.find((item) => item.id === clientId)
      if (!client || (!body.trim() && mediaUrls.length === 0)) return null
      const message: TextMessage = {
        id: crypto.randomUUID(),
        direction: "out",
        body: body.trim(),
        mediaUrls: mediaUrls.slice(0, 4),
        createdAt: new Date().toISOString(),
        estimateId: dealForClient(latest.estimates, clientId)?.id ?? null,
        delivery: "logged",
      }
      commit(applyOutbound(latest, clientId, message))
      return message
    },
    markTextDelivery: (clientId, messageId, delivery) => {
      const latest = getSnapshot().state
      const next = markOutboundDelivery(latest, clientId, messageId, delivery)
      if (next !== latest) commit(next)
    },
    saveBusinessPhone: (phone) => {
      const latest = getSnapshot().state
      commit({
        ...latest,
        estimateSettings: { ...latest.estimateSettings, businessPhone: phone.trim() },
      })
    },
    unmatchedTexts: state.unmatchedTexts ?? [],
    zapierDelivered: state.zapierDelivered ?? [],
    customColumns: state.customColumns ?? [],
    columnLabels: state.columnLabels ?? {},
    holdFollowUp: (estimateId, minutes) => {
      const latest = getSnapshot().state
      const estimate = latest.estimates.find((item) => item.id === estimateId)
      if (!estimate?.followUp || estimate.followUp.status !== "active") return
      const span = Number.isFinite(minutes) && minutes > 0 ? minutes : 15
      const holdUntil = new Date(Date.now() + span * 60 * 1000).toISOString()
      commit({
        ...latest,
        estimates: latest.estimates.map((item) =>
          item.id === estimateId && item.followUp
            ? { ...item, followUp: { ...item.followUp, holdUntil } }
            : item,
        ),
      })
    },
    resetDemo: () => {
      clearSessionDrafts()
      const latest = getSnapshot().state
      const fresh = createCompanyBook(latest.estimateSettings.companyName?.trim() || "ScopePipe")
      fresh.estimateSettings = {
        ...fresh.estimateSettings,
        companyEmail: latest.estimateSettings.companyEmail,
        businessPhone: latest.estimateSettings.businessPhone,
      }
      commit(fresh, null, { sync: false })
    },
    updatePrepNotes: (estimateId, prepNotes) => {
      const latest = getSnapshot().state
      commit({
        ...latest,
        workOrders: latest.workOrders.map((order) =>
          order.estimateId === estimateId ? { ...order, prepNotes } : order,
        ),
      })
    },
    setHourDisplay: (estimateId, hourDisplay) => {
      const latest = getSnapshot().state
      commit({
        ...latest,
        workOrders: latest.workOrders.map((order) =>
          order.estimateId === estimateId ? { ...order, hourDisplay } : order,
        ),
      })
    },
    signSubcontractorCopy: (estimateId, name, signedDate) => {
      const signature = subcontractorSignature(name, signedDate)
      if (!signature) return { ok: false, reason: "Enter the crew lead's name." }
      const latest = getSnapshot().state
      const order = latest.workOrders.find((item) => item.estimateId === estimateId)
      if (!order) return { ok: false, reason: "This work order isn't on this device." }
      if (order.subSignature) return { ok: true }
      commit({
        ...latest,
        workOrders: latest.workOrders.map((item) =>
          item.estimateId === estimateId ? { ...item, ...signature } : item,
        ),
      })
      return { ok: true }
    },
    toggleChecklist: (estimateId, itemId) => {
      const latest = getSnapshot().state
      commit({
        ...latest,
        workOrders: latest.workOrders.map((order) => {
          if (order.estimateId !== estimateId) return order
          return {
            ...order,
            checklist: order.checklist.map((item) =>
              item.id === itemId ? { ...item, done: !item.done } : item,
            ),
          }
        }),
      })
    },
    applyChangeOrder: (changeOrder, lineItems) => {
      const latest = getSnapshot().state
      const result = applyChangeOrder(latest, changeOrder, lineItems)
      if (!result.ok) return result
      commit(result.state)
      void syncChangeOrder(changeOrder).catch(() => undefined)
      return { ok: true }
    },
    applyPendingSignature: (estimateId, lineIds, clientSignatureUrl) => {
      const latest = getSnapshot().state
      const estimate = latest.estimates.find((item) => item.id === estimateId)
      if (!estimate) return { ok: false, reason: "This work order is not on file." }
      const signed = signPendingWork(estimate, { lineIds, clientSignatureUrl })
      if (!signed.ok) return signed
      commit({
        ...latest,
        estimates: latest.estimates.map((item) => (item.id === estimateId ? signed.estimate : item)),
      })
      if (signed.changeOrder) void syncChangeOrder(signed.changeOrder).catch(() => undefined)
      return { ok: true }
    },
    postProposalChat: (estimateId, body) => {
      const latest = getSnapshot().state
      const estimate = latest.estimates.find((item) => item.id === estimateId)
      if (!estimate) return { ok: false, reason: "This proposal is not on file." }
      const posted = postProposalMessage(estimate, { from: "office", body })
      if (!posted.ok) return posted
      commit({
        ...latest,
        estimates: latest.estimates.map((item) => (item.id === estimateId ? posted.estimate : item)),
      })
      return { ok: true }
    },
    applyQuickBooksCredits: (rows) => {
      const latest = getSnapshot().state
      const byCredit = new Map(rows.filter((row) => row.quickbooksCreditId).map((row) => [`${row.estimateId}:${row.creditId}`, row.quickbooksCreditId]))
      let changed = false
      const estimates = latest.estimates.map((estimate) => {
        if (!estimate.credits?.length) return estimate
        let creditChanged = false
        const credits = estimate.credits.map((credit) => {
          const quickbooksCreditId = byCredit.get(`${estimate.id}:${credit.id}`)
          if (!quickbooksCreditId || credit.quickbooksCreditId === quickbooksCreditId) return credit
          creditChanged = true
          return { ...credit, quickbooksCreditId }
        })
        if (!creditChanged) return estimate
        changed = true
        return { ...estimate, credits }
      })
      if (changed) commit({ ...latest, estimates })
    },
    addSitePhoto: (estimateId, photo) => {
      const latest = getSnapshot().state
      const estimate = latest.estimates.find((item) => item.id === estimateId)
      if (!estimate) return
      const next: SitePhoto = {
        id: photo.id ?? crypto.randomUUID(),
        estimateId,
        caption: photo.caption.trim(),
        tag: photo.tag,
        linkKind: photo.linkKind,
        linkId: photo.linkId,
        storagePath: photo.storagePath,
        url: photo.url,
        createdAt: photo.createdAt ?? new Date().toISOString(),
      }
      const existing = latest.workOrders.some((order) => order.estimateId === estimateId)
      const workOrders = existing
        ? latest.workOrders.map((order) =>
            order.estimateId === estimateId ? { ...order, photos: [next, ...order.photos] } : order,
          )
        : [{ ...createWorkOrder(estimate), photos: [next] }, ...latest.workOrders]
      commit({ ...latest, workOrders })
    },
  }
}

export function ScopeProvider({ children }: { children: React.ReactNode }) {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
  const api = useMemo(() => buildApi(snapshot), [snapshot])
  useEffect(() => {
    if (!snapshot.session) return
    let cancelled = false
    void readCompanyProfile().then((profile) => {
      if (cancelled || !profile?.companyName.trim() || !getSnapshot().session) return
      const latest = getSnapshot().state
      commit({
        ...latest,
        estimateSettings: {
          ...latest.estimateSettings,
          companyName: profile.companyName.trim(),
          companyEmail: profile.companyEmail.trim() || latest.estimateSettings.companyEmail,
        },
      })
    })
    return () => {
      cancelled = true
    }
  }, [snapshot.session?.id])
  useEffect(() => {
    return subscribeDispatch((remote) => {
      const latest = getSnapshot().state
      const result = applyAssignment(
        latest,
        {
          estimateId: remote.estimate_id,
          status: remote.status,
          assignedCrewId: remote.assigned_crew_id,
          scheduledStartDate: remote.scheduled_start_date,
          notifiedAt: remote.notified_at ?? new Date().toISOString(),
        },
        { allowUnknownCrew: true },
      )
      if (!result.ok || !result.changed) return
      commit(result.state, result.notice || current.notice)
    })
  }, [])
  return <ScopeContext.Provider value={api}>{children}</ScopeContext.Provider>
}

function existingToken(state: ScopeState, id: string): string {
  return state.estimates.find((estimate) => estimate.id === id)?.publicToken || crypto.randomUUID().replace(/-/g, "")
}

export function useScope(): ScopeApi {
  const api = useContext(ScopeContext)
  if (!api) throw new Error("useScope must be used inside ScopeProvider")
  return api
}
