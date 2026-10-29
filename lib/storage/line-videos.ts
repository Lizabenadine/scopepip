import fs from "node:fs"
import path from "node:path"
import { inspectLineVideo, isLineVideoId, type LineVideoType } from "../estimate/line-video.ts"
import { supabaseAdmin } from "../supabase/admin.ts"

const BUCKET = "line-videos"

export interface StoredLineVideo {
  url: string
  storagePath: string
  contentType: LineVideoType
}

export function storeLineVideo(input: {
  companyId: string
  estimateId: string
  lineId: string
  bytes: Uint8Array
}): Promise<{ ok: true; video: StoredLineVideo } | { ok: false; reason: string }> {
  const inspected = inspectLineVideo({ bytes: input.bytes })
  if (!inspected.ok) return Promise.resolve(inspected)
  const admin = supabaseAdmin()
  if (admin) return storeInBucket(admin, input, inspected)
  if (process.env.VERCEL) {
    return Promise.resolve({
      ok: false,
      reason: "Video storage is not ready. Add SUPABASE_SECRET_KEY on the host.",
    })
  }
  return Promise.resolve(storeOnDisk(input, inspected))
}

export function openLineVideo(id: string): { contentType: LineVideoType; size: number; filePath: string } | null {
  if (!isLineVideoId(id)) return null
  const filePath = path.join(videosDir(), id)
  const metaPath = `${filePath}.json`
  if (!fs.existsSync(filePath) || !fs.existsSync(metaPath)) return null
  let contentType: LineVideoType | null = null
  try {
    const meta = JSON.parse(fs.readFileSync(metaPath, "utf8")) as { contentType?: string }
    contentType = videoType(meta.contentType)
  } catch {
    return null
  }
  if (!contentType) return null
  const size = fs.statSync(filePath).size
  if (size <= 0) return null
  return { contentType, size, filePath }
}

function videosDir(): string {
  return process.env.LINE_VIDEOS_DIR || path.join(process.cwd(), "data", "line-videos")
}

function storeOnDisk(
  input: { bytes: Uint8Array },
  inspected: { contentType: LineVideoType },
): { ok: true; video: StoredLineVideo } {
  const id = crypto.randomUUID()
  const dir = videosDir()
  fs.mkdirSync(dir, { recursive: true })
  const filePath = path.join(dir, id)
  fs.writeFileSync(filePath, input.bytes)
  fs.writeFileSync(`${filePath}.json`, JSON.stringify({ contentType: inspected.contentType }))
  return {
    ok: true,
    video: {
      url: `/api/line-videos/${id}`,
      storagePath: `local/${id}`,
      contentType: inspected.contentType,
    },
  }
}

async function storeInBucket(
  admin: NonNullable<ReturnType<typeof supabaseAdmin>>,
  input: { companyId: string; estimateId: string; lineId: string; bytes: Uint8Array },
  inspected: { contentType: LineVideoType; extension: ".mp4" | ".mov" | ".webm" },
): Promise<{ ok: true; video: StoredLineVideo } | { ok: false; reason: string }> {
  const id = crypto.randomUUID()
  const storagePath = `${pathPart(input.companyId)}/${pathPart(input.estimateId)}/${pathPart(input.lineId)}/${id}${inspected.extension}`
  const body = Buffer.from(input.bytes)
  let uploaded = await admin.storage.from(BUCKET).upload(storagePath, body, {
    contentType: inspected.contentType,
    upsert: false,
  })
  if (uploaded.error && /bucket/i.test(uploaded.error.message)) {
    await admin.storage.createBucket(BUCKET, { public: true })
    uploaded = await admin.storage.from(BUCKET).upload(storagePath, body, {
      contentType: inspected.contentType,
      upsert: false,
    })
  }
  if (uploaded.error) return { ok: false, reason: "That video didn't upload." }
  const { data } = admin.storage.from(BUCKET).getPublicUrl(storagePath)
  return {
    ok: true,
    video: { url: data.publicUrl, storagePath, contentType: inspected.contentType },
  }
}

function pathPart(value: string): string {
  const safe = value.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 80)
  return safe || "job"
}

function videoType(value: string | undefined): LineVideoType | null {
  if (value === "video/mp4" || value === "video/quicktime" || value === "video/webm") return value
  return null
}
