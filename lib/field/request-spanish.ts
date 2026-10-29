"use client"

import { translatePainting } from "@/lib/field/terms"

const timers = new Map<string, ReturnType<typeof setTimeout>>()

export async function requestSpanish(text: string): Promise<string> {
  const trimmed = text.trim()
  if (!trimmed) return ""
  try {
    const response = await fetch("/api/translate", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ text: trimmed }),
    })
    if (!response.ok) return translatePainting(trimmed, "es")
    const body = (await response.json()) as { spanish?: string }
    const spanish = body.spanish?.trim()
    return spanish || translatePainting(trimmed, "es")
  } catch {
    return translatePainting(trimmed, "es")
  }
}

/** Wait until the estimator pauses, then store Spanish beside the English they just typed. */
export function queueSpanish(key: string, text: string, apply: (spanish: string) => void): void {
  const pending = timers.get(key)
  if (pending) clearTimeout(pending)
  const trimmed = text.trim()
  if (!trimmed) {
    apply("")
    timers.delete(key)
    return
  }
  timers.set(
    key,
    setTimeout(() => {
      timers.delete(key)
      void requestSpanish(trimmed).then(apply)
    }, 600),
  )
}
