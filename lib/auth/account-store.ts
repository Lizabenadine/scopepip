import fs from "node:fs"
import path from "node:path"
import { supabaseAdmin } from "../supabase/admin.ts"

const BUCKET = "scopepipe"

function remoteClient() {
  if (process.env.ACCOUNTS_PATH || process.env.BOOKS_DIR) return null
  return supabaseAdmin()
}

export async function readJsonFile(localPath: string, remoteKey: string): Promise<string | null> {
  const admin = remoteClient()
  if (!admin) {
    try {
      return fs.readFileSync(localPath, "utf8")
    } catch {
      return null
    }
  }
  const { data, error } = await admin.storage.from(BUCKET).download(remoteKey)
  if (error || !data) return null
  return data.text()
}

export async function writeJsonFile(localPath: string, remoteKey: string, text: string): Promise<void> {
  const admin = remoteClient()
  if (!admin) {
    if (process.env.VERCEL || localPath.startsWith("/var/task")) {
      throw new Error("Add SUPABASE_SECRET_KEY in the Vercel project settings, then redeploy. The host cannot create /var/task/data/books.")
    }
    fs.mkdirSync(path.dirname(localPath), { recursive: true })
    const tmp = `${localPath}.${process.pid}.tmp`
    fs.writeFileSync(tmp, text)
    fs.renameSync(tmp, localPath)
    return
  }
  const { error } = await admin.storage.from(BUCKET).upload(remoteKey, new Blob([text], { type: "application/json" }), {
    upsert: true,
    contentType: "application/json",
  })
  if (error) throw new Error(error.message)
}

export async function listJsonNames(localDir: string, remotePrefix: string): Promise<string[]> {
  const admin = remoteClient()
  if (!admin) {
    try {
      return fs.readdirSync(localDir).filter((name) => name.endsWith(".json"))
    } catch {
      return []
    }
  }
  const { data, error } = await admin.storage.from(BUCKET).list(remotePrefix, { limit: 1000 })
  if (error || !data) return []
  return data.map((item) => item.name).filter((name) => name.endsWith(".json"))
}
