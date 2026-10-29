import type { Metadata } from "next"
import { VerifyEmailScreen } from "@/components/auth/verify-email-screen"

export const metadata: Metadata = {
  title: "Check your email",
}

export default async function VerifyEmailPage({ searchParams }: { searchParams: Promise<{ email?: string }> }) {
  const params = await searchParams
  const email = params.email?.trim() || "your inbox"
  return <VerifyEmailScreen email={email} />
}
