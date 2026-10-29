"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { Client } from "@/lib/types"

export function ClientField({
  clients,
  name,
  clientId,
  onChange,
}: {
  clients: Client[]
  name: string
  clientId: string | null
  onChange: (next: { name: string; clientId: string | null }) => void
}) {
  const [open, setOpen] = useState(false)
  const needle = name.trim().toLowerCase()
  const matches = needle
    ? clients
        .filter((client) => client.name.toLowerCase().includes(needle))
        .slice(0, 5)
    : clients.slice(0, 5)

  return (
    <div className="relative">
      <Label htmlFor="client-name">Client</Label>
      <Input
        id="client-name"
        value={name}
        autoComplete="off"
        placeholder="Name on the estimate"
        className="mt-2 h-12 text-base md:text-base"
        onFocus={() => setOpen(true)}
        onBlur={() => {
          window.setTimeout(() => setOpen(false), 120)
        }}
        onValueChange={(nextName) => {
          const exact = clients.find(
            (client) => client.name.toLowerCase() === nextName.trim().toLowerCase(),
          )
          onChange({ name: nextName, clientId: exact?.id ?? null })
        }}
      />
      <p className="mt-1.5 text-xs text-muted-foreground">
        {clientId
          ? "Saved client"
          : name.trim()
            ? "New client — created when you save"
            : "Pick someone in the book, or type a new name"}
      </p>
      {open && matches.length > 0 ? (
        <ul className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-xl bg-popover p-1 shadow-lg border border-slate-200 bg-white shadow-sm">
          {matches.map((client) => (
            <li key={client.id}>
              <button
                type="button"
                className="flex w-full flex-col rounded-lg px-3 py-2 text-left hover:bg-muted"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => {
                  onChange({ name: client.name, clientId: client.id })
                  setOpen(false)
                }}
              >
                <span className="font-medium">{client.name}</span>
                {client.address ? (
                  <span className="text-xs text-muted-foreground">{client.address}</span>
                ) : null}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
