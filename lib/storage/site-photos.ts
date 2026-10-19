const BUCKET = "site-photos"

export function sitePhotoStorage(): "supabase" | "device" {
  if (
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    return "supabase"
  }
  return "device"
}

function readAsDataUrl(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === "string") resolve(reader.result)
      else reject(new Error("Could not read that photo."))
    }
    reader.onerror = () => reject(new Error("Could not read that photo."))
    reader.readAsDataURL(file)
  })
}

async function compressForDevice(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file)
  const maxEdge = 1280
  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement("canvas")
  canvas.width = Math.max(1, Math.round(bitmap.width * scale))
  canvas.height = Math.max(1, Math.round(bitmap.height * scale))
  const context = canvas.getContext("2d")
  if (!context) {
    bitmap.close()
    return readAsDataUrl(file)
  }
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()
  return canvas.toDataURL("image/jpeg", 0.72)
}

export async function prepareSitePhoto(file: File): Promise<File> {
  if (!file.type.startsWith("image/")) throw new Error("Choose a photo.")
  const url = await compressForDevice(file)
  const header = url.slice(0, url.indexOf(","))
  const mime = header.match(/data:(.*?);/)?.[1] || "image/jpeg"
  const binary = atob(url.slice(url.indexOf(",") + 1))
  const bytes = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index)
  const name = file.name.replace(/\.\w+$/, "") || "site"
  return new File([bytes], `${name}.jpg`, { type: mime })
}

export async function uploadSitePhoto(
  estimateId: string,
  file: File,
): Promise<{ storagePath: string; url: string }> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Choose a photo.")
  }
  const photoId = crypto.randomUUID()
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "") || "site.jpg"

  if (sitePhotoStorage() === "device") {
    const url = await compressForDevice(file)
    return { storagePath: `local/${estimateId}/${photoId}-${safeName}`, url }
  }

  const { createClient } = await import("@/lib/supabase/client")
  const supabase = createClient()
  const { data: userData, error: userError } = await supabase.auth.getUser()
  if (userError || !userData.user) {
    throw new Error("Sign in before uploading site photos.")
  }
  const storagePath = `${userData.user.id}/${estimateId}/${photoId}-${safeName}`
  const { error } = await supabase.storage.from(BUCKET).upload(storagePath, file, {
    contentType: file.type || "image/jpeg",
    upsert: false,
  })
  if (error) throw new Error(error.message)
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(storagePath)
  return { storagePath, url: data.publicUrl }
}
