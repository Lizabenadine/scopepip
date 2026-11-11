"use client"

import { useState } from "react"
import { ChevronDown, ChevronUp, StickyNote } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useScope } from "@/lib/data/store"
import type { Estimate, NoteEntry } from "@/lib/types"

export function formatNoteTimestamp(iso: string): string {
  const parsed = new Date(iso)
  if (Number.isNaN(parsed.getTime())) return iso
  return parsed.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
}

export function cardNoteEntries(estimate: Pick<Estimate, "noteLog" | "notes" | "updatedAt">): NoteEntry[] {
  const logged = estimate.noteLog ?? []
  if (logged.length > 0) {
    return [...logged].reverse()
  }
  if (estimate.notes.trim()) {
    return [
      {
        id: "legacy-note",
        at: estimate.updatedAt,
        body: estimate.notes.trim(),
      },
    ]
  }
  return []
}

export function CardNotesSection({ estimate }: { estimate: Estimate }) {
  const { addEstimateNote } = useScope()
  const [expanded, setExpanded] = useState(false)
  const [draft, setDraft] = useState("")
  const entries = cardNoteEntries(estimate)
  const latest = entries[0]

  return (
    <div
      data-interactive="true"
      data-testid={`card-notes-${estimate.id}`}
      onClick={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
      className="rounded-xl border border-slate-200/80 bg-slate-50/80 px-2.5 py-2 text-xs"
    >
      <button
        type="button"
        data-interactive="true"
        data-testid={`notes-toggle-${estimate.id}`}
        onClick={() => setExpanded((current) => !current)}
        className="flex w-full items-center justify-between gap-2 text-left font-medium text-slate-700 hover:text-slate-900"
      >
        <span className="inline-flex min-w-0 items-center gap-1.5">
          <StickyNote className="size-3.5 shrink-0 text-slate-500" />
          <span className="truncate">
            Internal notes{entries.length > 0 ? ` (${entries.length})` : ""}
          </span>
        </span>
        {expanded ? (
          <ChevronUp className="size-3.5 shrink-0 text-slate-400" />
        ) : (
          <ChevronDown className="size-3.5 shrink-0 text-slate-400" />
        )}
      </button>

      {!expanded && latest ? (
        <p className="mt-1 truncate text-[11px] text-slate-600" data-testid={`latest-note-${estimate.id}`}>
          <span className="font-medium text-slate-500">{formatNoteTimestamp(latest.at)}: </span>
          {latest.body}
        </p>
      ) : null}

      {expanded ? (
        <div className="mt-2 flex flex-col gap-2">
          {entries.length === 0 ? (
            <p className="text-[11px] text-slate-500">No internal notes yet.</p>
          ) : (
            <ul className="flex max-h-36 flex-col gap-1.5 overflow-y-auto pr-0.5" data-testid={`note-list-${estimate.id}`}>
              {entries.map((entry) => (
                <li key={entry.id} className="rounded-lg border border-slate-200/70 bg-white px-2 py-1.5">
                  <p className="text-[10px] font-medium text-slate-400">
                    {formatNoteTimestamp(entry.at)}
                  </p>
                  <p className="mt-0.5 whitespace-pre-wrap break-words text-[11px] text-slate-700">
                    {entry.body}
                  </p>
                </li>
              ))}
            </ul>
          )}

          <div className="flex flex-col gap-1.5">
            <textarea
              data-interactive="true"
              data-testid={`card-note-input-${estimate.id}`}
              aria-label="Internal job note"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              rows={2}
              placeholder="Add internal note..."
              className="min-h-14 w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-800 outline-none focus:border-primary"
            />
            <Button
              type="button"
              size="sm"
              data-interactive="true"
              data-testid={`card-note-save-${estimate.id}`}
              disabled={!draft.trim()}
              onClick={() => {
                if (!draft.trim()) return
                addEstimateNote(estimate.id, draft)
                setDraft("")
              }}
              className="h-8 self-end px-3 text-xs"
            >
              Add note
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
