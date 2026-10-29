"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useScope } from "@/lib/data/store"
import { FOLLOW_UP_STAGE_COPY, defaultSequences } from "@/lib/follow-ups/defaults"
import type { FollowUpAnchor, FollowUpChannel, FollowUpSequence, FollowUpStage } from "@/lib/follow-ups/types"

interface Transport {
  email: boolean
  text: boolean
}

export function FollowUpEditor({ heading = true }: { heading?: boolean }) {
  const { ready, followUpSequences, saveFollowUpSequences } = useScope()
  const [draft, setDraft] = useState<FollowUpSequence[] | null>(null)
  const [transport, setTransport] = useState<Transport | null>(null)
  const [savedNote, setSavedNote] = useState("")

  useEffect(() => {
    if (!ready) return
    setDraft((current) => current ?? cloneSequences(followUpSequences))
  }, [ready, followUpSequences])

  useEffect(() => {
    let cancelled = false
    void fetch("/api/follow-ups/send")
      .then((response) => response.json())
      .then((body: Transport) => {
        if (!cancelled) setTransport({ email: Boolean(body.email), text: Boolean(body.text) })
      })
      .catch(() => {
        if (!cancelled) setTransport({ email: false, text: false })
      })
    return () => {
      cancelled = true
    }
  }, [])

  if (!ready || !draft) {
    return <div className="h-40 animate-pulse rounded-2xl bg-muted" aria-hidden />
  }

  function updateSequence(stage: FollowUpStage, patch: Partial<FollowUpSequence>) {
    setSavedNote("")
    setDraft((current) =>
      current?.map((sequence) => (sequence.stage === stage ? { ...sequence, ...patch } : sequence)) ?? current,
    )
  }

  function updateStep(stage: FollowUpStage, stepId: string, patch: Partial<FollowUpSequence["steps"][number]>) {
    setSavedNote("")
    setDraft((current) =>
      current?.map((sequence) => {
        if (sequence.stage !== stage) return sequence
        return {
          ...sequence,
          steps: sequence.steps.map((step) => (step.id === stepId ? { ...step, ...patch } : step)),
        }
      }) ?? current,
    )
  }

  function addStep(stage: FollowUpStage) {
    setSavedNote("")
    setDraft((current) =>
      current?.map((sequence) => {
        if (sequence.stage !== stage) return sequence
        return {
          ...sequence,
          steps: [
            ...sequence.steps,
            {
              id: `${stage}-${crypto.randomUUID()}`,
              channel: "email",
              anchor: "entered",
              offsetHours: 24,
              subject: "",
              body: "",
            },
          ],
        }
      }) ?? current,
    )
  }

  function removeStep(stage: FollowUpStage, stepId: string) {
    setSavedNote("")
    setDraft((current) =>
      current?.map((sequence) =>
        sequence.stage === stage
          ? { ...sequence, steps: sequence.steps.filter((step) => step.id !== stepId) }
          : sequence,
      ) ?? current,
    )
  }

  return (
    <div className="flex flex-col gap-6" data-testid="follow-up-editor">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="max-w-2xl">
          {heading ? <h1 className="text-2xl font-semibold tracking-tight">Follow-ups</h1> : null}
          <p className={heading ? "mt-1 text-sm text-muted-foreground" : "text-sm text-muted-foreground"}>
            Every column follows up on its own. A sent quote gets a note the next day, again at three days, and
            again at a week, each with the proposal link. Cold and warm leads use their own cadence, and a finished
            job asks for a review the next day. A reply or a booked visit stops a pursuit. Messages log on the deal
            until Resend and Twilio keys are set.
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Tokens: {"{client}"} {"{company}"} {"{address}"} {"{visit}"} {"{job}"} {"{salesperson}"} {"{book}"}{" "}
            {"{proposal}"}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              const next = cloneSequences(defaultSequences())
              setDraft(next)
              saveFollowUpSequences(next)
              setSavedNote("Reset to the built-in sequences.")
            }}
          >
            Reset to defaults
          </Button>
          <Button
            type="button"
            data-testid="save-follow-ups"
            onClick={() => {
              saveFollowUpSequences(draft)
              setSavedNote("Saved.")
            }}
          >
            Save sequences
          </Button>
        </div>
      </div>
      <div className="rounded-2xl bg-muted/50 px-4 py-3 text-sm" data-testid="follow-up-transport">
        <p>{transport ? emailStatus(transport.email) : "Checking email…"}</p>
        <p>{transport ? textStatus(transport.text) : "Checking texts…"}</p>
        {savedNote ? <p className="mt-1 font-medium">{savedNote}</p> : null}
      </div>
      {draft.map((sequence) => {
        const copy = FOLLOW_UP_STAGE_COPY[sequence.stage]
        return (
          <section key={sequence.stage} className="flex flex-col gap-4 rounded-2xl bg-card p-4 ring-1 ring-foreground/10">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">{copy.label}</h2>
                <p className="text-sm text-muted-foreground">{copy.cadence}</p>
              </div>
              <label className="flex items-center gap-2 text-sm font-medium">
                <input
                  type="checkbox"
                  checked={sequence.enabled}
                  onChange={(event) => updateSequence(sequence.stage, { enabled: event.target.checked })}
                />
                Send this sequence
              </label>
            </div>
            {sequence.steps.map((step, index) => (
              <div key={step.id} className="grid gap-3 rounded-xl bg-muted/40 p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium">Step {index + 1}</p>
                  <button
                    type="button"
                    className="text-xs font-medium text-muted-foreground hover:text-foreground"
                    onClick={() => removeStep(sequence.stage, step.id)}
                  >
                    Remove
                  </button>
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  <label className="grid gap-1 text-sm">
                    <span className="text-muted-foreground">Channel</span>
                    <select
                      value={step.channel}
                      onChange={(event) =>
                        updateStep(sequence.stage, step.id, { channel: event.target.value as FollowUpChannel })
                      }
                      className="h-9 rounded-lg border border-input bg-background px-2"
                    >
                      <option value="email">Email</option>
                      <option value="text">Text</option>
                    </select>
                  </label>
                  <label className="grid gap-1 text-sm">
                    <span className="text-muted-foreground">Count from</span>
                    <select
                      value={step.anchor}
                      onChange={(event) =>
                        updateStep(sequence.stage, step.id, { anchor: event.target.value as FollowUpAnchor })
                      }
                      className="h-9 rounded-lg border border-input bg-background px-2"
                    >
                      <option value="entered">Entered this column</option>
                      <option value="before_visit">Before the visit</option>
                      <option value="before_job">Before the job</option>
                    </select>
                  </label>
                  <div className="grid gap-1">
                    <Label htmlFor={`${step.id}-hours`}>Offset hours</Label>
                    <Input
                      id={`${step.id}-hours`}
                      inputMode="numeric"
                      value={String(step.offsetHours)}
                      onValueChange={(value) =>
                        updateStep(sequence.stage, step.id, { offsetHours: hoursFrom(value) })
                      }
                    />
                  </div>
                </div>
                <div className="grid gap-1">
                  <Label htmlFor={`${step.id}-subject`}>Subject</Label>
                  <Input
                    id={`${step.id}-subject`}
                    value={step.subject}
                    onValueChange={(value) => updateStep(sequence.stage, step.id, { subject: value })}
                  />
                </div>
                <label className="grid gap-1 text-sm">
                  <span className="font-medium">Message</span>
                  <textarea
                    data-testid={`follow-up-body-${step.id}`}
                    value={step.body}
                    rows={4}
                    onChange={(event) => updateStep(sequence.stage, step.id, { body: event.target.value })}
                    className="min-h-24 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none"
                  />
                </label>
              </div>
            ))}
            <Button type="button" variant="outline" onClick={() => addStep(sequence.stage)}>
              Add step
            </Button>
          </section>
        )
      })}
    </div>
  )
}

function cloneSequences(sequences: FollowUpSequence[]): FollowUpSequence[] {
  return sequences.map((sequence) => ({
    ...sequence,
    steps: sequence.steps.map((step) => ({ ...step })),
  }))
}

function hoursFrom(value: string): number {
  const offset = Number(value)
  if (!Number.isFinite(offset)) return 0
  return Math.min(8760, Math.max(0, Math.round(offset)))
}

function emailStatus(connected: boolean): string {
  return connected
    ? "Email sends through Resend."
    : "Email logs on the deal until RESEND_API_KEY and FOLLOW_UP_FROM_EMAIL are set."
}

function textStatus(connected: boolean): string {
  return connected
    ? "Texts send through Twilio."
    : "Texts log on the deal until TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_FROM_NUMBER are set."
}
