"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useScope } from "@/lib/data/store"
import { readOutboundHooks } from "@/lib/webhooks/hooks"
import { HOOK_EVENT_LABELS, HOOK_EVENTS, type HookEvent } from "@/lib/webhooks/moments"
import { zapierTarget } from "@/lib/zapier/events"
import type { OutboundHook } from "@/lib/types"

export function OutboundHooks() {
  const scope = useScope()
  const hooks = readOutboundHooks(scope.estimateSettings.outboundHooks)
  const [event, setEvent] = useState<HookEvent>("lead.created")
  const [address, setAddress] = useState("")
  const [detail, setDetail] = useState("")

  function save(next: OutboundHook[], message: string) {
    scope.updateEstimateSettings({ ...scope.estimateSettings, outboundHooks: next })
    setDetail(message)
  }

  function turnOn() {
    const url = zapierTarget(address)
    if (!url) {
      setDetail("The hook needs an https address.")
      return
    }
    const next = readOutboundHooks([
      ...hooks,
      { id: crypto.randomUUID(), event, url, active: true },
    ])
    save(next, `${HOOK_EVENT_LABELS[event]} will post to that address.`)
    setAddress("")
  }

  return (
    <div>
      <h2 className="text-lg font-semibold">Automatic hooks</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Turn a hook on for a new lead, a proposal sent, a proposal signed, or a job completed. ScopePipe posts to that https address when the moment happens.
      </p>
      <div className="mt-3 grid gap-2">
        <Label htmlFor="outboundHookEvent">Event</Label>
        <select
          id="outboundHookEvent"
          value={event}
          data-testid="outbound-hook-event"
          className="h-11 rounded-lg border border-input bg-transparent px-3 text-base outline-none"
          onChange={(change) => {
            if ((HOOK_EVENTS as readonly string[]).includes(change.target.value)) {
              setEvent(change.target.value as HookEvent)
            }
          }}
        >
          {HOOK_EVENTS.map((item) => (
            <option key={item} value={item}>
              {HOOK_EVENT_LABELS[item]}
            </option>
          ))}
        </select>
        <Label htmlFor="outboundHookUrl">Webhook URL</Label>
        <Input
          id="outboundHookUrl"
          value={address}
          className="h-11"
          placeholder="https://"
          onValueChange={setAddress}
          data-testid="outbound-hook-url"
        />
      </div>
      <Button type="button" className="mt-3 h-11" data-testid="outbound-hook-save" onClick={turnOn}>
        Turn hook on
      </Button>
      {detail ? <p className="mt-2 text-sm" data-testid="outbound-hook-status">{detail}</p> : null}
      {hooks.length > 0 ? (
        <ul className="mt-4 flex flex-col gap-3">
          {hooks.map((hook) => (
            <li key={hook.id} className="rounded-xl bg-background px-3 py-3 border border-slate-200 bg-white shadow-sm" data-testid={`outbound-hook-${hook.id}`}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-medium">{HOOK_EVENT_LABELS[hook.event]}</p>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={hook.active}
                    data-testid={`outbound-hook-active-${hook.id}`}
                    onChange={() =>
                      save(
                        hooks.map((item) => (item.id === hook.id ? { ...item, active: !item.active } : item)),
                        hook.active ? `${HOOK_EVENT_LABELS[hook.event]} is paused.` : `${HOOK_EVENT_LABELS[hook.event]} is on.`,
                      )
                    }
                  />
                  On
                </label>
              </div>
              <p className="mt-1 break-all font-mono text-sm">{hook.url}</p>
              <button
                type="button"
                className="mt-2 text-sm text-muted-foreground"
                data-testid={`outbound-hook-remove-${hook.id}`}
                onClick={() => save(hooks.filter((item) => item.id !== hook.id), `${HOOK_EVENT_LABELS[hook.event]} hook removed.`)}
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
