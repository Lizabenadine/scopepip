"use client"

import { usePathname } from "next/navigation"
import { RecoveryListener } from "@/components/auth/recovery-listener"
import { ClientProposalShell } from "@/components/proposal/client-shell"
import { AppShell } from "@/components/shell/app-shell"
import { ScopeProvider } from "@/lib/data/store"

export function isClientProposalPath(pathname: string): boolean {
  return pathname.startsWith("/p/") || pathname.startsWith("/book/")
}

export function RootBoundary({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  if (isClientProposalPath(pathname)) {
    return <ClientProposalShell>{children}</ClientProposalShell>
  }

  return (
    <>
      <RecoveryListener />
      <ScopeProvider>
        <AppShell>{children}</AppShell>
      </ScopeProvider>
    </>
  )
}
