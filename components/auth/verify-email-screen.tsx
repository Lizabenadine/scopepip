export function VerifyEmailScreen({ email }: { email: string }) {
  return (
    <div className="grid gap-3">
      <h1 className="text-2xl font-semibold tracking-tight text-white">Check your email</h1>
      <p className="text-sm text-slate-300" data-testid="verify-email">
        Check {email} for a confirmation link. Open that link in this browser and you are signed in. You do not need to enter the password again.
      </p>
    </div>
  )
}
