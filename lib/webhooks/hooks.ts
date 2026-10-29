import type { OutboundHook } from "../types.ts"
import { zapierTarget } from "../zapier/events.ts"
import { HOOK_EVENTS, type HookEvent } from "./moments.ts"

/** Hooks the office turned on. An http address or an unknown event is dropped. */
export function readOutboundHooks(value: OutboundHook[] | undefined): OutboundHook[] {
  if (!Array.isArray(value)) return []
  const hooks: OutboundHook[] = []
  for (const hook of value) {
    if (!hook || typeof hook.id !== "string" || !hook.id.trim()) continue
    if (!isHookEvent(hook.event)) continue
    const url = zapierTarget(hook.url)
    if (!url) continue
    hooks.push({ id: hook.id, event: hook.event, url, active: hook.active !== false })
    if (hooks.length === 20) break
  }
  return hooks
}

export function isHookEvent(value: string): value is HookEvent {
  return (HOOK_EVENTS as readonly string[]).includes(value)
}
