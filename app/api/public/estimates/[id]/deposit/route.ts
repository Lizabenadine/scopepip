import { recordPublicDeposit } from "@/lib/auth/directory"
import type { DepositReceipt } from "@/lib/types"

export const runtime = "nodejs"

function isReceipt(value: unknown): value is DepositReceipt {
  if (!value || typeof value !== "object") return false
  const receipt = value as DepositReceipt
  return (
    typeof receipt.paymentIntentId === "string" &&
    receipt.paymentIntentId.length > 0 &&
    receipt.paymentIntentId.length < 200 &&
    typeof receipt.amount === "number" &&
    Number.isFinite(receipt.amount) &&
    receipt.currency === "usd" &&
    typeof receipt.depositPercent === "number" &&
    typeof receipt.paidAt === "string" &&
    (receipt.method === "card" || receipt.method === "apple_pay" || receipt.method === "google_pay")
  )
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params
  if (!/^[a-z0-9-]{4,80}$/i.test(id)) {
    return Response.json({ ok: false, reason: "This estimate is not on file." }, { status: 404 })
  }
  const body = await request.json().catch(() => null)
  if (!isReceipt(body)) return Response.json({ ok: false, reason: "The deposit could not be read." }, { status: 400 })
  const result = await recordPublicDeposit(id, body)
  if (!result.ok) return Response.json(result, { status: 400 })
  return Response.json(result)
}
