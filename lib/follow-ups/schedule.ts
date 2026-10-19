import { localDayOfInstant, visitReminderPhrase } from "../appointments/visit.ts"
import { bookingLink } from "../bookings/slots.ts"
import type { ScopeState } from "../data/seed.ts"
import { jobStageOf, salesStageOf } from "../pipeline/board.ts"
import type { Client, Estimate } from "../types.ts"
import { displayCompanyName } from "../brand/company.ts"
import { defaultSequences } from "./defaults.ts"
import type {
  DueFollowUp,
  FollowUpAnchor,
  FollowUpChannel,
  FollowUpEnrollment,
  FollowUpSequence,
  FollowUpStage,
  FollowUpStep,
  FollowUpStop,
} from "./types.ts"
import { FOLLOW_UP_STAGES } from "./types.ts"

const PURSUIT = new Set<FollowUpStage>(["cold", "warm", "estimate_requested", "proposal_sent"])

const HOUR_MS = 60 * 60 * 1000

export function resolveSequences(saved: FollowUpSequence[] | undefined): FollowUpSequence[] {
  const defaults = defaultSequences()
  if (!saved?.length) return defaults
  return defaults.map((fallback) => {
    const custom = saved.find((item) => item.stage === fallback.stage)
    if (!custom || !Array.isArray(custom.steps)) return fallback
    const steps = custom.steps.map(normalizeStep).filter((step): step is FollowUpStep => step !== null)
    return {
      stage: fallback.stage,
      enabled: custom.enabled !== false,
      steps,
    }
  })
}

export function followUpStageFor(state: ScopeState, estimate: Estimate): FollowUpStage | null {
  const sales = salesStageOf(estimate)
  if (sales) return sales
  const stage = state.stages.find((item) => item.id === estimate.stageId)
  const order = state.workOrders.find((item) => item.estimateId === estimate.id)
  return jobStageOf(estimate, order, stage?.slug)
}

export function reconcileEnrollment(
  enrollment: FollowUpEnrollment | null | undefined,
  stage: FollowUpStage | null,
  nowIso: string,
): FollowUpEnrollment | null {
  if (!stage) {
    if (enrollment?.status === "active") {
      return { ...enrollment, status: "stopped", stoppedReason: "archived", holdUntil: null }
    }
    return enrollment ?? null
  }
  if (!enrollment || enrollment.stage !== stage) return startEnrollment(stage, nowIso)
  return enrollment
}

export function startEnrollment(stage: FollowUpStage, nowIso: string): FollowUpEnrollment {
  return {
    stage,
    startedAt: nowIso,
    status: "active",
    stoppedReason: null,
    sentStepIds: [],
    holdUntil: null,
  }
}

export function stopPursuit(enrollment: FollowUpEnrollment | null | undefined): FollowUpEnrollment | null {
  if (!enrollment || enrollment.status !== "active" || !PURSUIT.has(enrollment.stage)) return enrollment ?? null
  return { ...enrollment, status: "stopped", stoppedReason: "visit_booked", holdUntil: null }
}

export function stopForReply(enrollment: FollowUpEnrollment | null | undefined): FollowUpEnrollment | null {
  if (!enrollment || enrollment.status !== "active") return enrollment ?? null
  return { ...enrollment, status: "stopped", stoppedReason: "reply", holdUntil: null }
}

export function reconcileFollowUps(state: ScopeState, nowIso: string): ScopeState {
  let changed = false
  const estimates = state.estimates.map((estimate) => {
    const stage = followUpStageFor(state, estimate)
    const next = reconcileEnrollment(estimate.followUp, stage, nowIso)
    if (sameEnrollment(estimate.followUp, next)) return estimate
    changed = true
    return { ...estimate, followUp: next }
  })
  if (!changed) return state
  return { ...state, estimates }
}

export function renderFollowUp(template: string, vars: Record<string, string>): string {
  return template.replace(/\{(client|company|address|visit|job|salesperson|book)\}/g, (_, key: string) => vars[key] ?? "")
}

export function clientFirstName(name: string): string {
  const first = name.trim().split(/\s+/)[0]
  return first || "there"
}

export function visitDayOf(estimate: Estimate): string | null {
  if (estimate.estimateVisitOn && isoDay(estimate.estimateVisitOn)) return estimate.estimateVisitOn
  const fromInstant = localDayOfInstant(estimate.estimateVisitAt)
  if (fromInstant) return fromInstant
  const match = estimate.notes.match(/Estimate visit (\d{4}-\d{2}-\d{2})/)
  return match?.[1] ?? null
}

export function collectDueFollowUps(state: ScopeState, nowMs: number): DueFollowUp[] {
  const sequences = resolveSequences(state.followUpSequences)
  const due: DueFollowUp[] = []
  for (const estimate of state.estimates) {
    const picked = inspectFollowUp(state, estimate, sequences, nowMs)
    if (picked.kind !== "due") continue
    due.push({
      estimateId: estimate.id,
      stepId: picked.step.id,
      stage: picked.stage,
      channel: picked.step.channel,
      to: picked.to,
      subject: renderFollowUp(picked.step.subject, picked.vars),
      body: renderFollowUp(picked.step.body, picked.vars),
    })
  }
  return due
}

export function describeFollowUp(state: ScopeState, estimate: Estimate, nowMs: number): string {
  const sequences = resolveSequences(state.followUpSequences)
  const picked = inspectFollowUp(state, estimate, sequences, nowMs)
  if (picked.kind === "stopped") {
    if (picked.reason === "reply") return "Follow-up stopped. Customer replied."
    if (picked.reason === "visit_booked") return "Follow-up stopped. Visit booked."
    return "Follow-up stopped."
  }
  if (picked.kind === "waiting") return "Follow-up starts while this office is open."
  if (picked.kind === "off") return "Follow-up is off for this column."
  if (picked.kind === "hold") return `Next ${channelName(picked.step.channel)} is waiting to retry.`
  if (picked.kind === "needs-contact") {
    return picked.step.channel === "email" ? "Add an email to send the next note." : "Add a phone number to send the next text."
  }
  if (picked.kind === "needs-date") {
    return picked.step.anchor === "before_job" ? "Waiting for a job start date." : "Waiting for a visit date."
  }
  if (picked.kind === "done") return "Follow-up finished."
  if (picked.kind === "scheduled") {
    return `Next ${channelName(picked.step.channel)} ${relative(nowMs, picked.at)}.`
  }
  return `Next ${channelName(picked.step.channel)} due now.`
}

type Inspection =
  | { kind: "due"; step: FollowUpStep; stage: FollowUpStage; to: string; vars: Record<string, string> }
  | { kind: "scheduled"; step: FollowUpStep; at: number }
  | { kind: "needs-contact"; step: FollowUpStep }
  | { kind: "needs-date"; step: FollowUpStep }
  | { kind: "hold"; step: FollowUpStep }
  | { kind: "done" }
  | { kind: "off" }
  | { kind: "waiting" }
  | { kind: "stopped"; reason: FollowUpStop | null }

function inspectFollowUp(
  state: ScopeState,
  estimate: Estimate,
  sequences: FollowUpSequence[],
  nowMs: number,
): Inspection {
  const enrollment = estimate.followUp
  if (!enrollment) return { kind: "waiting" }
  if (enrollment.status === "stopped") return { kind: "stopped", reason: enrollment.stoppedReason ?? null }
  const sequence = sequences.find((item) => item.stage === enrollment.stage)
  if (!sequence?.enabled) return { kind: "off" }
  const holdUntil = enrollment.holdUntil ? Date.parse(enrollment.holdUntil) : NaN
  const client = state.clients.find((item) => item.id === estimate.clientId)
  const visitDay = visitDayOf(estimate)
  const jobDay = state.workOrders.find((order) => order.estimateId === estimate.id)?.scheduledStartDate ?? null
  const anchors: FollowUpAnchorInstants = { visitStartInstant: estimate.estimateVisitAt }
  const vars = messageVars(state, estimate, client, visitDay, jobDay)
  const unsent = sequence.steps.filter((step) => step.body.trim() && !enrollment.sentStepIds.includes(step.id))
  const timed = unsent
    .map((step) => ({ step, at: dueAt(step, enrollment.startedAt, visitDay, jobDay, anchors) }))
    .filter((item): item is { step: FollowUpStep; at: number } => item.at !== null)
    .sort((left, right) => left.at - right.at)
  const due = timed.filter((item) => item.at <= nowMs)
  const firstDue = due[0]
  if (firstDue) {
    if (Number.isFinite(holdUntil) && holdUntil > nowMs) return { kind: "hold", step: firstDue.step }
    const to = destination(firstDue.step.channel, client)
    if (!to) return { kind: "needs-contact", step: firstDue.step }
    return { kind: "due", step: firstDue.step, stage: enrollment.stage, to, vars }
  }
  const upcoming = timed.find((item) => item.at > nowMs)
  if (upcoming) return { kind: "scheduled", step: upcoming.step, at: upcoming.at }
  const undated = unsent.find((step) => dueAt(step, enrollment.startedAt, visitDay, jobDay, anchors) === null)
  if (undated) return { kind: "needs-date", step: undated }
  return { kind: "done" }
}

export interface FollowUpAnchorInstants {
  visitStartInstant?: string | null
  jobStartInstant?: string | null
}

export function dueAt(
  step: FollowUpStep,
  startedAt: string,
  visitDay: string | null,
  jobDay: string | null,
  anchors?: FollowUpAnchorInstants | null,
): number | null {
  if (step.anchor === "entered") {
    const started = Date.parse(startedAt)
    if (!Number.isFinite(started)) return null
    return started + step.offsetHours * HOUR_MS
  }
  const day = step.anchor === "before_visit" ? visitDay : jobDay
  const startInstant = step.anchor === "before_visit" ? anchors?.visitStartInstant : anchors?.jobStartInstant
  const start = anchorStartMs(day, startInstant)
  if (start === null) return null
  return start - step.offsetHours * HOUR_MS
}

function anchorStartMs(day: string | null, startInstant: string | null | undefined): number | null {
  if (startInstant) {
    const ms = Date.parse(startInstant)
    if (Number.isFinite(ms)) return ms
  }
  return day ? noonUtc(day) : null
}

function messageVars(
  state: ScopeState,
  estimate: Estimate,
  client: Client | undefined,
  visitDay: string | null,
  jobDay: string | null,
): Record<string, string> {
  return {
    client: clientFirstName(client?.name ?? ""),
    company: displayCompanyName(state.estimateSettings.companyName),
    address: estimate.jobAddress.trim() || "your place",
    visit: visitReminderPhrase(visitDay, estimate.estimateVisitAt),
    job: jobDay && isoDay(jobDay) ? dayLabel(jobDay) : "the start day",
    salesperson: estimate.salesperson?.trim() || displayCompanyName(state.estimateSettings.companyName),
    book: bookingLink(estimate.publicToken),
  }
}

function destination(channel: FollowUpChannel, client: Client | undefined): string {
  if (!client) return ""
  if (channel === "email") {
    const email = client.email.trim()
    return email.includes("@") ? email : ""
  }
  const digits = client.phone.replace(/\D/g, "")
  return digits.length >= 10 ? client.phone.trim() : ""
}

function channelName(channel: FollowUpChannel): string {
  return channel === "email" ? "email" : "text"
}

function relative(nowMs: number, at: number): string {
  const hours = Math.max(1, Math.round((at - nowMs) / HOUR_MS))
  if (hours < 24) return `in ${hours} hr`
  const days = Math.round(hours / 24)
  return days === 1 ? "in 1 day" : `in ${days} days`
}

function dayLabel(day: string): string {
  const noon = noonUtc(day)
  if (noon === null) return day
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" }).format(noon)
}

function noonUtc(day: string): number | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(day)
  if (!match) return null
  return Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12, 0, 0, 0)
}

function isoDay(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value)
}

function sameEnrollment(
  left: FollowUpEnrollment | null | undefined,
  right: FollowUpEnrollment | null,
): boolean {
  if (!left && !right) return true
  if (!left || !right) return false
  return (
    left.stage === right.stage &&
    left.startedAt === right.startedAt &&
    left.status === right.status &&
    (left.stoppedReason ?? null) === (right.stoppedReason ?? null) &&
    (left.holdUntil ?? null) === (right.holdUntil ?? null) &&
    left.sentStepIds.length === right.sentStepIds.length &&
    left.sentStepIds.every((id, index) => id === right.sentStepIds[index])
  )
}

function normalizeStep(value: FollowUpStep): FollowUpStep | null {
  if (!value || typeof value !== "object") return null
  const id = typeof value.id === "string" ? value.id.trim() : ""
  if (!id) return null
  const channel: FollowUpChannel = value.channel === "text" ? "text" : "email"
  const anchor: FollowUpAnchor =
    value.anchor === "before_visit" || value.anchor === "before_job" ? value.anchor : "entered"
  const offset = Number(value.offsetHours)
  const offsetHours = Number.isFinite(offset) ? Math.min(8760, Math.max(0, Math.round(offset))) : 0
  return {
    id,
    channel,
    anchor,
    offsetHours,
    subject: typeof value.subject === "string" ? value.subject : "",
    body: typeof value.body === "string" ? value.body : "",
  }
}

export function isFollowUpStage(value: string): value is FollowUpStage {
  return (FOLLOW_UP_STAGES as readonly string[]).includes(value)
}
