export const FOLLOW_UP_STAGES = [
  "cold",
  "warm",
  "estimate_requested",
  "estimate_scheduled",
  "proposal_sent",
  "project_accepted",
  "project_scheduled",
  "project_in_progress",
  "project_completed",
] as const

export type FollowUpStage = (typeof FOLLOW_UP_STAGES)[number]

export type FollowUpChannel = "email" | "text"

/** `entered` counts from enrollment. `before_visit` and `before_job` count back from the start instant, or from noon UTC when only a day is stored. */
export type FollowUpAnchor = "entered" | "before_visit" | "before_job"

export type FollowUpStop = "reply" | "visit_booked" | "archived"

export interface FollowUpStep {
  id: string
  channel: FollowUpChannel
  anchor: FollowUpAnchor
  offsetHours: number
  subject: string
  body: string
}

export interface FollowUpSequence {
  stage: FollowUpStage
  enabled: boolean
  steps: FollowUpStep[]
}

export interface FollowUpEnrollment {
  stage: FollowUpStage
  startedAt: string
  status: "active" | "stopped"
  stoppedReason?: FollowUpStop | null
  sentStepIds: string[]
  holdUntil?: string | null
}

export interface FollowUpMessage {
  id: string
  estimateId: string
  stepId: string
  stage: FollowUpStage
  channel: FollowUpChannel
  to: string
  subject: string
  body: string
  sentAt: string
  delivery: "sent" | "logged" | "skipped"
  detail: string
}

export interface DueFollowUp {
  estimateId: string
  stepId: string
  stage: FollowUpStage
  channel: FollowUpChannel
  to: string
  subject: string
  body: string
}
