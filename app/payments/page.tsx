import type { Metadata } from "next"
import { PaymentsList } from "@/components/payments/payments-list"
import { QuickBooksSync } from "@/components/payments/quickbooks-sync"

export const metadata: Metadata = {
  title: "Invoices & Payments",
}

export default function PaymentsPage() {
  return (
    <div className="flex flex-col gap-4">
      <QuickBooksSync />
      <PaymentsList />
    </div>
  )
}
