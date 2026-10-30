"use client"

export function NavigateToJobsite({ address }: { address: string }) {
  const jobsiteAddress = address.trim()
  if (!jobsiteAddress) return null

  return (
    <button
      type="button"
      data-testid="navigate-jobsite"
      onClick={() => {
        const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(jobsiteAddress)}&dir_action=navigate`
        window.open(mapsUrl, "_blank", "noopener,noreferrer")
      }}
      className="flex items-center gap-2 rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm font-medium text-cyan-400 transition-colors hover:bg-slate-700"
    >
      <svg className="h-4 w-4 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
      Navigate to Jobsite
    </button>
  )
}
