"use client"

import { useState } from "react"

export function LeadFormClient({ token, companyName }: { token: string; companyName: string }) {
  const [name, setName] = useState("")
  const [phone, setPhone] = useState("")
  const [email, setEmail] = useState("")
  const [address, setAddress] = useState("")
  const [notes, setNotes] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState("")

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) {
      setError("Please enter your name.")
      return
    }
    if (!phone.trim() && !email.trim()) {
      setError("Please enter a phone number or email so we can reach you.")
      return
    }

    setSubmitting(true)
    setError("")

    try {
      const response = await fetch(`/api/webhooks/leads/${token}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          source: "website",
          name: name.trim(),
          phone: phone.trim(),
          email: email.trim(),
          address: address.trim(),
          message: notes.trim(),
        }),
      })

      const data = (await response.json()) as { ok?: boolean; reason?: string }
      if (response.ok && data.ok) {
        setSubmitted(true)
      } else {
        setError(data.reason || "We could not submit your request. Please try again.")
      }
    } catch {
      setError("Connection error. Please try again or call us directly.")
    } finally {
      setSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <div className="text-center py-8" data-testid="lead-form-success">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 mb-4">
          <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-slate-900">Thank You, {name}!</h2>
        <p className="mt-2 text-sm text-slate-600">
          Your inquiry has been sent to {companyName}. A team member will review your project and get in touch with you shortly.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" data-testid="lead-form">
      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700" data-testid="lead-form-error">
          {error}
        </div>
      ) : null}

      <div>
        <label htmlFor="lead-name" className="block text-sm font-medium text-slate-700">
          Your Name <span className="text-red-500">*</span>
        </label>
        <input
          id="lead-name"
          type="text"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Jane Doe"
          data-testid="lead-name"
          className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 shadow-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="lead-phone" className="block text-sm font-medium text-slate-700">
            Phone Number <span className="text-red-500">*</span>
          </label>
          <input
            id="lead-phone"
            type="tel"
            required
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="(555) 000-0000"
            data-testid="lead-phone"
            className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 shadow-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
          />
        </div>

        <div>
          <label htmlFor="lead-email" className="block text-sm font-medium text-slate-700">
            Email Address
          </label>
          <input
            id="lead-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="jane@example.com"
            data-testid="lead-email"
            className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 shadow-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
          />
        </div>
      </div>

      <div>
        <label htmlFor="lead-address" className="block text-sm font-medium text-slate-700">
          Project Address / City
        </label>
        <input
          id="lead-address"
          type="text"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="123 Maple St, Portland"
          data-testid="lead-address"
          className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 shadow-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
        />
      </div>

      <div>
        <label htmlFor="lead-notes" className="block text-sm font-medium text-slate-700">
          How can we help? (Project details)
        </label>
        <textarea
          id="lead-notes"
          rows={3}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Interior painting, drywall repair, exterior repaint..."
          data-testid="lead-notes"
          className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 shadow-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
        />
      </div>

      <button
        type="submit"
        disabled={submitting}
        data-testid="lead-submit"
        className="w-full rounded-lg bg-cyan-600 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-cyan-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-600 disabled:opacity-50"
      >
        {submitting ? "Sending Inquiry..." : "Submit Estimate Request"}
      </button>
    </form>
  )
}
