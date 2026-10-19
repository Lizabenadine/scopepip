import type { Metadata } from "next"
import { OwnerOnly } from "@/components/auth/owner-only"
import { ClientBook } from "@/components/clients/client-book"
import { PastCustomerMail } from "@/components/clients/past-customer-mail"

export const metadata: Metadata = {
  title: "Clients",
}

export default function ClientsPage() {
  return (
    <div className="flex flex-col gap-4">
      <OwnerOnly>
        <PastCustomerMail />
        <ClientBook />
      </OwnerOnly>
    </div>
  )
}
