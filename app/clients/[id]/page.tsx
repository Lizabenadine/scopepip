import type { Metadata } from "next"
import { OwnerOnly } from "@/components/auth/owner-only"
import { ClientScreen } from "@/components/clients/client-screen"

export const metadata: Metadata = {
  title: "Client",
}

export default async function ClientPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return (
    <OwnerOnly>
      <ClientScreen id={id} />
    </OwnerOnly>
  )
}
