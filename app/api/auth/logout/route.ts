import { clearSession } from "@/lib/auth/request"

export const runtime = "nodejs"

export function POST() {
  return clearSession({ ok: true })
}
