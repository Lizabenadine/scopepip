import { Suspense } from "react"
import type { Metadata } from "next"
import { ResetPasswordForm } from "@/components/auth/reset-password-form"

export const metadata: Metadata = {
  title: "Set new password",
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="mx-auto grid w-full max-w-md gap-6 p-6 text-center text-sm text-muted-foreground">Loading...</div>}>
      <ResetPasswordForm />
    </Suspense>
  )
}
