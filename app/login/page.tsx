import type { Metadata } from "next"
import { AuthForm } from "@/components/auth/auth-form"

export const metadata: Metadata = {
  title: "Sign in",
}

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ confirmed?: string }> }) {
  const params = await searchParams
  const banner = params.confirmed === "1" ? "Your email is confirmed. Sign in with the same password to open the office." : null
  return <AuthForm mode="login" banner={banner} />
}
