"use client"

import { Check } from "lucide-react"
import { useFieldLanguage } from "@/hooks/use-field-language"
import { translatePainting } from "@/lib/field/terms"
import { cn } from "@/lib/utils"
import type { ChecklistItem } from "@/lib/types"

export function CompletionChecklist({
  items,
  onToggle,
}: {
  items: ChecklistItem[]
  onToggle: (id: string) => void
}) {
  const { copy, language } = useFieldLanguage()
  const done = items.filter((item) => item.done).length

  return (
    <section className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-xs font-semibold tracking-[0.14em] text-muted-foreground uppercase">
          {copy.checklist}
        </h2>
        <p className="text-xs text-muted-foreground tabular-nums">
          {copy.checklistProgress(done, items.length)}
        </p>
      </div>
      <ul className="flex flex-col gap-2">
        {items.map((item) => (
          <li key={item.id}>
            <button
              type="button"
              role="checkbox"
              aria-checked={item.done}
              onClick={() => onToggle(item.id)}
              className={cn(
                "flex min-h-12 w-full items-center gap-3 rounded-2xl px-4 py-3 text-left border border-slate-200 bg-white shadow-sm",
                item.done ? "bg-muted text-muted-foreground" : "bg-card",
              )}
            >
              <span
                className={cn(
                  "flex size-6 shrink-0 items-center justify-center rounded-md ring-1 ring-foreground/20",
                  item.done && "bg-primary text-primary-foreground ring-primary",
                )}
              >
                {item.done ? <Check className="size-4" /> : null}
              </span>
              <span className={cn("text-sm", item.done && "line-through")}>
                {translatePainting(copy.checklistLabel(item.label), language)}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}
