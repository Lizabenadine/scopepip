import type { Metadata } from "next"
import { PaymentsList } from "@/components/payments/payments-list"

export const metadata: Metadata = {
  title: "Invoices & Payments",
}

export default function PaymentsPage() {
  return <PaymentsList />
}
