import { notFound } from "next/navigation"
import { companyForLeadWebhook } from "@/lib/auth/directory"
import { LeadFormClient } from "./lead-form-client"

export const runtime = "nodejs"

export default async function LeadFormPage(props: { params: Promise<{ token: string }> }) {
  const { token } = await props.params
  const found = await companyForLeadWebhook(token)
  if (!found) {
    return notFound()
  }

  const companyName = found.book.state.estimateSettings?.companyName?.trim() || "Contractor Services"

  return (
    <main className="min-h-screen bg-slate-50 flex items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-lg bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8">
        <header className="mb-6 text-center">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">{companyName}</h1>
          <p className="mt-1 text-sm text-slate-600">Request a Free Estimate or Project Consultation</p>
        </header>
        <LeadFormClient token={token} companyName={companyName} />
      </div>
    </main>
  )
}
