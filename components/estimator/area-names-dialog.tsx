"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import {
  addAreaName,
  areaFromName,
  moveAreaName,
  removeAreaName,
  renameAreaName,
  type AreaName,
} from "@/lib/estimate/area-names"
import type { AreaInput } from "@/lib/types"

export function AreaNamesDialog({
  open,
  names,
  onOpenChange,
  onNames,
  onAdd,
}: {
  open: boolean
  names: AreaName[]
  onOpenChange: (open: boolean) => void
  onNames: (names: AreaName[]) => void
  onAdd: (area: AreaInput) => void
}) {
  const [draft, setDraft] = useState("")
  const [error, setError] = useState<string | null>(null)

  const keep = () => {
    const next = addAreaName(names, draft)
    if (!next) {
      setError(draft.trim() ? "That name is already on the list." : "Enter a name.")
      return
    }
    onNames(next)
    setDraft("")
    setError(null)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[min(40rem,85vh)] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Area names</DialogTitle>
          <DialogDescription>
            These are labels only. Move them up or down to set the order. A template still brings the dimensions and the surfaces.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-2">
          {names.map((item, index) => (
            <div key={item.id} className="flex items-center gap-1">
              <Input
                aria-label={`Area name ${index + 1}`}
                value={item.name}
                className="h-11"
                onValueChange={(name) => onNames(renameAreaName(names, item.id, name))}
              />
              <button
                type="button"
                className="h-11 shrink-0 px-2 text-sm font-medium text-primary"
                data-testid={`use-area-name-${item.id}`}
                onClick={() => {
                  onAdd(areaFromName(item.name))
                  onOpenChange(false)
                }}
              >
                Add
              </button>
              <button
                type="button"
                className="h-11 shrink-0 px-2 text-sm text-muted-foreground disabled:opacity-40"
                aria-label={`Move ${item.name} up`}
                disabled={index === 0}
                onClick={() => onNames(moveAreaName(names, item.id, -1))}
              >
                Up
              </button>
              <button
                type="button"
                className="h-11 shrink-0 px-2 text-sm text-muted-foreground disabled:opacity-40"
                aria-label={`Move ${item.name} down`}
                disabled={index === names.length - 1}
                onClick={() => onNames(moveAreaName(names, item.id, 1))}
              >
                Down
              </button>
              <button
                type="button"
                className="h-11 shrink-0 px-2 text-sm text-muted-foreground"
                aria-label={`Remove ${item.name}`}
                onClick={() => onNames(removeAreaName(names, item.id))}
              >
                Remove
              </button>
            </div>
          ))}
        </div>
        <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
          <Input
            aria-label="New area name"
            data-testid="area-name-draft"
            value={draft}
            placeholder="Sunroom"
            className="h-11"
            onValueChange={(value) => {
              setDraft(value)
              setError(null)
            }}
          />
          <button type="button" className="h-11 px-3 text-sm font-medium text-primary" data-testid="keep-area-name" onClick={keep}>
            Keep name
          </button>
        </div>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <button
          type="button"
          className="text-left text-sm font-medium text-primary"
          data-testid="add-custom-area"
          onClick={() => {
            onAdd(areaFromName("Room"))
            onOpenChange(false)
          }}
        >
          Blank room
        </button>
      </DialogContent>
    </Dialog>
  )
}
