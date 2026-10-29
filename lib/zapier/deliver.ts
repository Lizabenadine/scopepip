import { zapierTarget, type ZapierEvent } from "./events.ts"

/** One Catch Hook delivery. Zapier maps a single object, not a list. */
export async function postZapierEvent(url: string | undefined, event: ZapierEvent): Promise<boolean> {
  const target = zapierTarget(url)
  if (!target) return false
  try {
    const response = await fetch(target, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(event),
    })
    return response.ok
  } catch {
    return false
  }
}
