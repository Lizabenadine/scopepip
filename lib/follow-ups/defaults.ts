import type { FollowUpSequence, FollowUpStage, FollowUpStep } from "./types.ts"

export const FOLLOW_UP_STAGE_COPY: Record<FollowUpStage, { label: string; cadence: string }> = {
  cold: {
    label: "New lead",
    cadence: "Fast. The first text goes out as soon as the lead is in this column, then again across the next few days.",
  },
  warm: {
    label: "Contacted",
    cadence: "Slow. A note every week or two for leads who are not ready.",
  },
  estimate_requested: {
    label: "Estimate in progress",
    cadence: "Ask for a walkthrough time, then check again two days later.",
  },
  estimate_scheduled: {
    label: "Estimate scheduled",
    cadence: "A reminder the day before the visit, and a text the morning of the visit.",
  },
  proposal_sent: {
    label: "Proposal sent",
    cadence: "The quote follows up on its own: the next day, again at three days, and again at a week. Each note includes the proposal link.",
  },
  project_accepted: {
    label: "Accepted",
    cadence: "Confirm the job is on the books.",
  },
  project_scheduled: {
    label: "Scheduled",
    cadence: "Remind the customer before the crew starts.",
  },
  project_in_progress: {
    label: "In production",
    cadence: "A check-in once the crew is on site.",
  },
  project_completed: {
    label: "Completed",
    cadence: "Ask for a review after the job is done.",
  },
}

function step(
  id: string,
  channel: FollowUpStep["channel"],
  anchor: FollowUpStep["anchor"],
  offsetHours: number,
  subject: string,
  body: string,
): FollowUpStep {
  return { id, channel, anchor, offsetHours, subject, body }
}

export function defaultSequences(): FollowUpSequence[] {
  return [
    {
      stage: "cold",
      enabled: true,
      steps: [
        step(
          "cold-text-now",
          "text",
          "entered",
          0,
          "",
          "Hi {client}, this is {company}. We can walk the job at {address} and send a painting price. Pick a time: {book}",
        ),
        step(
          "cold-email-1h",
          "email",
          "entered",
          1,
          "Painting estimate for {address}",
          "Hi {client},\n\nThanks for reaching out to {company}. We can measure {address} and send a written price.\n\nPick a walkthrough time: {book}\n\n{salesperson}\n{company}",
        ),
        step(
          "cold-text-1d",
          "text",
          "entered",
          24,
          "",
          "Hi {client}, checking back on the paint work at {address}. Still want an estimate this week?",
        ),
        step(
          "cold-email-3d",
          "email",
          "entered",
          72,
          "Should we hold a spot for {address}?",
          "Hi {client},\n\nWe have not locked a walkthrough yet. Reply if you still want {company} to price the painting, and we will set a time.\n\n{salesperson}\n{company}",
        ),
        step(
          "cold-text-5d",
          "text",
          "entered",
          120,
          "",
          "Last note from {company} about {address}. Reply if you still want the estimate and we will pick it up.",
        ),
      ],
    },
    {
      stage: "warm",
      enabled: true,
      steps: [
        step(
          "warm-email-2d",
          "email",
          "entered",
          48,
          "Still thinking about the painting?",
          "Hi {client},\n\nWhenever you are ready for a price on {address}, {company} can walk it. No rush.\n\n{salesperson}\n{company}",
        ),
        step(
          "warm-text-7d",
          "text",
          "entered",
          168,
          "",
          "Hi {client}, {company} can still price the painting at {address}. Reply if you want a time.",
        ),
        step(
          "warm-email-14d",
          "email",
          "entered",
          336,
          "We are here when the paint job is ready",
          "Hi {client},\n\nChecking in on {address}. If the timing is better now, reply and {company} will schedule a walkthrough.\n\n{salesperson}\n{company}",
        ),
        step(
          "warm-text-30d",
          "text",
          "entered",
          720,
          "",
          "Hi {client}, one more note from {company} about {address}. Reply if you still want the estimate.",
        ),
      ],
    },
    {
      stage: "estimate_requested",
      enabled: true,
      steps: [
        step(
          "requested-text-1h",
          "text",
          "entered",
          1,
          "",
          "Hi {client}, {company} has your estimate request for {address}. Pick a time: {book}",
        ),
        step(
          "requested-email-2d",
          "email",
          "entered",
          48,
          "Pick a time for your painting walkthrough",
          "Hi {client},\n\nWe still need a day to measure {address}. Reply with a time and {company} will confirm it.\n\n{salesperson}\n{company}",
        ),
      ],
    },
    {
      stage: "estimate_scheduled",
      enabled: true,
      steps: [
        step(
          "visit-email-1d",
          "email",
          "before_visit",
          24,
          "Tomorrow: painting walkthrough at {address}",
          "Hi {client},\n\n{company} will be at {address} on {visit} to measure the painting. Reply if the time no longer works.\n\n{salesperson}\n{company}",
        ),
        step(
          "visit-text-2h",
          "text",
          "before_visit",
          2,
          "",
          "Hi {client}, {company} will be at {address} today for the painting walkthrough.",
        ),
      ],
    },
    {
      stage: "proposal_sent",
      enabled: true,
      steps: [
        step(
          "proposal-email-1d",
          "email",
          "entered",
          24,
          "Your painting proposal is ready",
          "Hi {client},\n\nYour proposal for {address} is ready: {proposal}\n\nReply with any questions and {company} will walk through it.\n\n{salesperson}\n{company}",
        ),
        step(
          "proposal-text-3d",
          "text",
          "entered",
          72,
          "",
          "Hi {client}, your painting proposal for {address} is here: {proposal}",
        ),
        step(
          "proposal-email-7d",
          "email",
          "entered",
          168,
          "Your painting proposal is still open",
          "Hi {client},\n\nThe proposal for {address} is still open: {proposal}\n\nReply if you want to change the scope, or if you are ready to start.\n\n{salesperson}\n{company}",
        ),
      ],
    },
    {
      stage: "project_accepted",
      enabled: true,
      steps: [
        step(
          "accepted-email-1h",
          "email",
          "entered",
          1,
          "You are on the books with {company}",
          "Hi {client},\n\n{company} has the paint job at {address}. We will confirm the crew and the start day next.\n\n{salesperson}\n{company}",
        ),
        step(
          "accepted-text-1d",
          "text",
          "entered",
          24,
          "",
          "Hi {client}, {company} has the paint job at {address}. We will confirm the start day as soon as the crew is set.",
        ),
      ],
    },
    {
      stage: "project_scheduled",
      enabled: true,
      steps: [
        step(
          "job-email-2d",
          "email",
          "before_job",
          48,
          "Your paint job starts {job}",
          "Hi {client},\n\n{company} is scheduled to start painting at {address} on {job}. Reply if someone needs to meet the crew.\n\n{salesperson}\n{company}",
        ),
        step(
          "job-text-1d",
          "text",
          "before_job",
          24,
          "",
          "Hi {client}, reminder that {company} starts painting at {address} on {job}.",
        ),
      ],
    },
    {
      stage: "project_in_progress",
      enabled: true,
      steps: [
        step(
          "progress-text-4h",
          "text",
          "entered",
          4,
          "",
          "Hi {client}, the {company} crew is working at {address}. Reply if you need us.",
        ),
        step(
          "progress-email-2d",
          "email",
          "entered",
          48,
          "How is the paint work going?",
          "Hi {client},\n\nChecking in on {address}. Reply if something needs another look while the crew is still on the job.\n\n{salesperson}\n{company}",
        ),
      ],
    },
    {
      stage: "project_completed",
      enabled: true,
      steps: [
        step(
          "review-email-1d",
          "email",
          "entered",
          24,
          "How did we do on {address}?",
          "Hi {client},\n\nThe paint job at {address} is complete. If it looks right, a short review helps other homeowners find {company}. Thank you.\n\n{salesperson}\n{company}",
        ),
        step(
          "review-text-3d",
          "text",
          "entered",
          72,
          "",
          "Hi {client}, if the paint at {address} looks right, a short review helps other homeowners find {company}. Thank you.",
        ),
      ],
    },
  ]
}
