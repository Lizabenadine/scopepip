import type { Metadata } from "next"
import { AuthForm } from "@/components/auth/auth-form"

export const metadata: Metadata = {
  title: "Create account",
}

export default async function SignupPage({ searchParams }: { searchParams: Promise<{ confirm?: string }> }) {
  const params = await searchParams
  const banner = params.confirm === "error" ? "That confirmation link did not sign you in. Create the account again, or sign in if you already confirmed it." : null
  return <AuthForm mode="signup" banner={banner} />
}
