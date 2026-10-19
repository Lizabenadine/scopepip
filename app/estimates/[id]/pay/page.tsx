import type { Metadata } from "next"
import { DepositCheckout } from "@/components/payments/deposit-checkout"

export const metadata: Metadata = {
  title: "Pay deposit",
}

export default async function PayDepositPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return <DepositCheckout id={id} />
}
