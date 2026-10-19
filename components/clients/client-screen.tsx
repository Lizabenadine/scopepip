"use client"

import { ClientDetail } from "@/components/clients/client-detail"

export function ClientScreen({ id }: { id: string }) {
  return <ClientDetail id={id} />
}
