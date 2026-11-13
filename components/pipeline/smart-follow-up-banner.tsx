"use client"

import { useState, type MouseEvent } from "react"
import { BellRing, Check, Copy, Mail, MessageSquare, X } from "lucide-react"
import { useScope } from "@/lib/data/store"
import { useClientNow } from "@/lib/browser/client-env"
import { getSmartFollowUpReminder } from "@/lib/pipeline/smart-follow-up"
import { planHasFeatureAccess } from "@/lib/billing/entitlement"
import type { Client, Estimate } from "@/lib/types"
import { cn } from "@/lib/utils"

export interface SmartFollowUpBannerProps {
  estimate: Estimate
  client?: Client
  className?: string
}

export function SmartFollowUpBanner({ estimate, client, className }: SmartFollowUpBannerProps) {
  const scope = useScope()
  const now = useClientNow() ?? Date.now()
  const [dismissed, setDismissed] = useState(false)
  const [copied, setCopied] = useState(false)

  if (dismissed) return null

  const access = planHasFeatureAccess(scope.session?.planTier, "smartFollowUps", scope.session?.subscriptionStatus)
  if (!access.allowed) return null

  const reminder = getSmartFollowUpReminder({
    estimate,
    client,
    nowMs: now,
  })

  if (!reminder) return null

  const handleCopy = async (e: MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation()
    try {
      await navigator.clipboard.writeText(reminder.suggestedMessage)
      setCopied(true)
      setTimeout(() => setCopied(false), 2200)
    } catch {
      // Fallback
    }
  }

  const handleDismiss = (e: MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation()
    setDismissed(true)

    // Persist dismissal on estimate tags
    const currentTags = estimate.tags ?? []
    if (!currentTags.includes(reminder.dismissKey)) {
      scope.setEstimateTags(estimate.id, [...currentTags, reminder.dismissKey])
    }

    try {
      localStorage.setItem(`scopepipe:followup-dismissed:${estimate.id}:${reminder.milestone}`, "true")
    } catch {
      // localStorage may be unavailable
    }
  }

  return (
    <div
      data-interactive="true"
      onClick={(e) => e.stopPropagation()}
      className={cn(
        "rounded-xl border border-amber-200 bg-amber-50/90 p-2.5 text-xs shadow-xs transition-all",
        className,
      )}
      data-testid={`follow-up-reminder-${estimate.id}`}
    >
      <div className="flex items-start justify-between gap-1.5">
        <div className="flex items-center gap-1.5 text-amber-900 font-semibold text-[11px]">
          <BellRing className="size-3.5 shrink-0 text-amber-600" />
          <span>{reminder.label}</span>
        </div>

        <button
          type="button"
          onClick={handleDismiss}
          className="flex size-5 shrink-0 items-center justify-center rounded-md text-amber-600 hover:bg-amber-200/60 hover:text-amber-900 transition-colors"
          title="Dismiss reminder"
          aria-label="Dismiss reminder"
          data-testid={`dismiss-reminder-${estimate.id}`}
        >
          <X className="size-3.5" />
        </button>
      </div>

      <p className="mt-1.5 rounded-lg border border-amber-200/60 bg-white/80 p-2 text-[11px] leading-relaxed text-slate-700 italic select-all">
        &ldquo;{reminder.suggestedMessage}&rdquo;
      </p>

      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          onClick={handleCopy}
          className={cn(
            "inline-flex h-7 items-center gap-1 rounded-md px-2.5 text-[11px] font-semibold transition-all shadow-xs",
            copied
              ? "bg-emerald-600 text-white"
              : "bg-amber-600 text-white hover:bg-amber-700",
          )}
          data-testid={`copy-reminder-${estimate.id}`}
        >
          {copied ? (
            <>
              <Check className="size-3" />
              <span>Copied!</span>
            </>
          ) : (
            <>
              <Copy className="size-3" />
              <span>Copy Message</span>
            </>
          )}
        </button>

        {reminder.clientPhone ? (
          <a
            href={`sms:${reminder.clientPhone}?body=${encodeURIComponent(reminder.suggestedMessage)}`}
            className="inline-flex h-7 items-center gap-1 rounded-md border border-amber-300 bg-white px-2 text-[11px] font-medium text-amber-900 hover:bg-amber-100/60 transition-colors"
            title="Send SMS"
            data-testid={`sms-reminder-${estimate.id}`}
          >
            <MessageSquare className="size-3 text-amber-700" />
            <span className="hidden xs:inline">Text</span>
          </a>
        ) : null}

        {reminder.clientEmail ? (
          <a
            href={`mailto:${reminder.clientEmail}?subject=${encodeURIComponent(
              `Follow-up on ${estimate.title || "Painting Proposal"}`,
            )}&body=${encodeURIComponent(reminder.suggestedMessage)}`}
            className="inline-flex h-7 items-center gap-1 rounded-md border border-amber-300 bg-white px-2 text-[11px] font-medium text-amber-900 hover:bg-amber-100/60 transition-colors"
            title="Send Email"
            data-testid={`email-reminder-${estimate.id}`}
          >
            <Mail className="size-3 text-amber-700" />
            <span className="hidden xs:inline">Email</span>
          </a>
        ) : null}
      </div>
    </div>
  )
}
