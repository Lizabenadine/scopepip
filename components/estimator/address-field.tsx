"use client"

import { useEffect, useState } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export function AddressField({
  value,
  onValueChange,
}: {
  value: string
  onValueChange: (value: string) => void
}) {
  const [matches, setMatches] = useState<string[]>([])
  const address = value.trim()
  const mapsUrl = address
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`
    : ""

  useEffect(() => {
    if (address.length < 3) {
      setMatches([])
      return
    }
    const timer = window.setTimeout(() => {
      void fetch(`/api/address/suggest?q=${encodeURIComponent(address)}`)
        .then((response) => response.json())
        .then((body: { suggestions?: string[] }) => {
          setMatches((body.suggestions ?? []).filter((item) => item !== address).slice(0, 5))
        })
        .catch(() => setMatches([]))
    }, 350)
    return () => window.clearTimeout(timer)
  }, [address])

  return (
    <div className="grid gap-2">
      <Label htmlFor="job-address">Address</Label>
      <Input
        id="job-address"
        value={value}
        placeholder="Street, city"
        autoComplete="street-address"
        className="h-11"
        onValueChange={onValueChange}
      />
      {matches.length > 0 ? (
        <ul className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm" data-testid="address-matches">
          {matches.map((match) => (
            <li key={match}>
              <button
                type="button"
                className="block w-full px-3 py-2 text-left text-sm hover:bg-slate-50"
                onClick={() => {
                  onValueChange(match)
                  setMatches([])
                }}
              >
                {match}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      {mapsUrl ? (
        <a
          href={mapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm font-medium break-words text-[#004789]"
          data-testid="address-map"
        >
          {address}
        </a>
      ) : null}
    </div>
  )
}
