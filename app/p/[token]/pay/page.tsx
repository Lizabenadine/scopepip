import type { Metadata } from "next"
import { ClientDepositCheckout } from "@/components/payments/deposit-checkout"

export const metadata: Metadata = {
  title: "Pay deposit",
}

export default async function ClientPayDepositPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  return <ClientDepositCheckout token={token} />
}
