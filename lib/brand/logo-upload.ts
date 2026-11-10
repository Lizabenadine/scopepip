import { logoFileError } from "./logo.ts"

const BUCKET = "scopepipe"

function readAsDataUrl(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === "string") resolve(reader.result)
      else reject(new Error("Could not read that image."))
    }
    reader.onerror = () => reject(new Error("Could not read that image."))
    reader.readAsDataURL(file)
  })
}

async function browserUpload(file: File): Promise<string | null> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) return null
  const { createClient } = await import("@/lib/supabase/client")
  const supabase = createClient()
  const { data } = await supabase.auth.getUser()
  if (!data.user) return null
  const { error } = await supabase.storage.from(BUCKET).upload(`logos/${data.user.id}/logo`, file, {
    contentType: file.type,
    upsert: true,
  })
  if (error) return null
  const { data: published } = supabase.storage.from(BUCKET).getPublicUrl(`logos/${data.user.id}/logo`)
  return `${published.publicUrl}?v=${Date.now()}`
}

/** Public logo address. A signed-in Supabase user writes company-assets; otherwise the office route does. */
export async function uploadCompanyLogo(file: File): Promise<string> {
  const reason = logoFileError(file)
  if (reason) throw new Error(reason)
  try {
    const fromBrowser = await browserUpload(file).catch(() => null)
    if (fromBrowser) return fromBrowser

    const body = new FormData()
    body.set("file", file)
    const response = await fetch("/api/brand/logo", { method: "POST", body })
    const result = (await response.json().catch(() => null)) as { url?: string; reason?: string } | null
    if (response.ok && result?.url) return result.url
    if (result?.reason === "storage-off") return readAsDataUrl(file)
  } catch {
    // Fall back to self-contained data URL
  }
  return readAsDataUrl(file)
}

export async function removeStoredLogo(): Promise<void> {
  await fetch("/api/brand/logo", { method: "DELETE" }).catch(() => undefined)
}
