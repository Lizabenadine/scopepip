"use client"

import { Check } from "lucide-react"
import { useFieldLanguage } from "@/hooks/use-field-language"
import { translatePainting } from "@/lib/field/terms"
import { cn } from "@/lib/utils"
import type { ChecklistItem } from "@/lib/types"

export function CompletionChecklist({
  items,
  onToggle,
  readOnly = false,
}: {
  items: ChecklistItem[]
  onToggle: (id: string) => void
  readOnly?: boolean
}) {
  const { copy, language } = useFieldLanguage()
  const done = items.filter((item) => item.done).length
  const progress = items.length === 0 ? 0 : Math.round((done / items.length) * 100)

  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-xs font-semibold tracking-[0.14em] text-[#004789] uppercase">
          {copy.checklist}
        </h2>
        <p className="text-sm font-semibold tabular-nums text-slate-800" data-testid="checklist-progress">
          {copy.checklistProgress(done, items.length)}
        </p>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-100" aria-hidden>
        <div className="h-full rounded-full bg-[#05C9FF]" style={{ width: `${progress}%` }} />
      </div>
      <ul className="flex flex-col gap-2">
        {items.map((item) => (
          <li key={item.id}>
            {readOnly ? (
              <div
                className={cn(
                  "flex min-h-12 w-full items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left shadow-sm",
                  item.done && "bg-muted text-muted-foreground",
                )}
              >
                <CheckMark done={item.done} />
                <span className={cn("text-sm", item.done && "line-through")}>
                  {translatePainting(copy.checklistLabel(item.label), language)}
                </span>
              </div>
            ) : (
              <button
                type="button"
                role="checkbox"
                aria-checked={item.done}
                onClick={() => onToggle(item.id)}
                className={cn(
                  "flex min-h-12 w-full items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left shadow-sm",
                  item.done ? "bg-muted text-muted-foreground" : "bg-card",
                )}
              >
                <CheckMark done={item.done} />
                <span className={cn("text-sm", item.done && "line-through")}>
                  {translatePainting(copy.checklistLabel(item.label), language)}
                </span>
              </button>
            )}
          </li>
        ))}
      </ul>
    </section>
  )
}

function CheckMark({ done }: { done: boolean }) {
  return (
    <span
      className={cn(
        "flex size-6 shrink-0 items-center justify-center rounded-md ring-1 ring-foreground/20",
        done && "bg-primary text-primary-foreground ring-primary",
      )}
    >
      {done ? <Check className="size-4" /> : null}
    </span>
  )
}
