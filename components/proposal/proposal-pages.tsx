import { CompanyName } from "@/components/brand/company-name"
import { money } from "@/lib/format"
import type { ProposalPageRef } from "@/lib/proposals/document"
import type { ProposalPhoto, ProposalTestimonial } from "@/lib/types"

export function ProposalPager({ pages }: { pages: ProposalPageRef[] }) {
  return (
    <nav
      aria-label="Proposal pages"
      data-testid="proposal-pages"
      className="sticky top-0 z-10 -mx-4 flex gap-2 overflow-x-auto bg-background/95 px-4 py-2 backdrop-blur sm:-mx-0 sm:px-0"
    >
      {pages.map((page) => (
        <a
          key={page.id}
          href={`#${page.id}`}
          className="shrink-0 rounded-full bg-muted px-3 py-1.5 text-sm font-medium"
        >
          {page.label}
        </a>
      ))}
    </nav>
  )
}

export function ProposalCover({
  companyName,
  clientName,
  title,
  jobAddress,
  companyEmail,
  preparedOn,
  expiresOn,
  total,
  coverLine,
  page,
  pageCount,
}: {
  companyName: string
  clientName: string
  title: string
  jobAddress: string
  companyEmail: string
  preparedOn: string
  expiresOn: string | null
  total: number
  coverLine: string
  page: number
  pageCount: number
}) {
  return (
    <section
      id="proposal-page-cover"
      data-testid="proposal-page-cover"
      data-proposal-section="Cover"
      className="flex min-h-[70vh] flex-col justify-between rounded-2xl bg-card p-6 border border-slate-200 bg-white shadow-sm sm:p-10 print:break-after-page"
    >
      <div>
        <CompanyName
          name={companyName}
          testId="proposal-brand"
          className="font-display text-3xl leading-none tracking-tight text-primary"
        />
        <p className="mt-6 text-xs font-semibold tracking-[0.14em] text-muted-foreground uppercase">Proposal</p>
        <h1 className="mt-2 font-display text-4xl leading-none tracking-tight sm:text-5xl">{title || "Painting proposal"}</h1>
        {coverLine ? (
          <p data-testid="proposal-cover-line" className="mt-4 max-w-xl text-base leading-7">
            {coverLine}
          </p>
        ) : null}
      </div>
      <div className="mt-10 grid gap-6 sm:grid-cols-2">
        <div>
          <p className="text-xs font-semibold tracking-[0.14em] text-muted-foreground uppercase">Prepared for</p>
          <p className="mt-1 text-lg font-medium">{clientName}</p>
          <p className="text-sm">{jobAddress || "Job site not set"}</p>
          {companyEmail ? <p className="mt-2 text-sm text-muted-foreground">{companyEmail}</p> : null}
          <p className="mt-2 text-sm text-muted-foreground">Prepared {preparedOn}</p>
          {expiresOn ? <p className="text-sm text-muted-foreground">Price holds through {expiresOn}</p> : null}
        </div>
        <div className="sm:text-right">
          <p className="text-xs font-semibold tracking-[0.14em] text-muted-foreground uppercase">Investment</p>
          <p data-testid="proposal-cover-total" className="mt-1 font-display text-4xl text-price tabular-nums">
            {money(total)}
          </p>
        </div>
      </div>
      <PageMark label="Cover" page={page} pageCount={pageCount} />
    </section>
  )
}

export function ProposalPhotoPage({
  photos,
  page,
  pageCount,
}: {
  photos: ProposalPhoto[]
  page: number
  pageCount: number
}) {
  return (
    <section
      id="proposal-page-photos"
      data-testid="proposal-page-photos"
      data-proposal-section="Photos"
      className="flex flex-col gap-4 rounded-2xl bg-card p-6 border border-slate-200 bg-white shadow-sm sm:p-8 print:break-after-page"
    >
      <div>
        <h2 className="text-xl font-semibold">Photos</h2>
        <p className="mt-1 text-sm text-muted-foreground">Work like the rooms on this proposal.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {photos.map((photo) => (
          <figure key={photo.id} className="overflow-hidden rounded-xl bg-muted">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={photo.src} alt={photo.caption || "Proposal photo"} className="aspect-[4/3] w-full object-cover" />
            {photo.caption ? <figcaption className="px-3 py-2 text-sm">{photo.caption}</figcaption> : null}
          </figure>
        ))}
      </div>
      <PageMark label="Photos" page={page} pageCount={pageCount} />
    </section>
  )
}

export function ProposalTestimonialPage({
  testimonials,
  page,
  pageCount,
}: {
  testimonials: ProposalTestimonial[]
  page: number
  pageCount: number
}) {
  return (
    <section
      id="proposal-page-testimonials"
      data-testid="proposal-page-testimonials"
      data-proposal-section="Testimonials"
      className="flex flex-col gap-4 rounded-2xl bg-card p-6 border border-slate-200 bg-white shadow-sm sm:p-8 print:break-after-page"
    >
      <h2 className="text-xl font-semibold">Testimonials</h2>
      <div className="flex flex-col gap-4">
        {testimonials.map((item) => (
          <blockquote key={item.id} className="border-l-2 border-primary pl-4">
            <p className="text-base leading-7">“{item.quote}”</p>
            <footer className="mt-2 text-sm text-muted-foreground">
              {item.name}
              {item.detail ? ` · ${item.detail}` : ""}
            </footer>
          </blockquote>
        ))}
      </div>
      <PageMark label="Testimonials" page={page} pageCount={pageCount} />
    </section>
  )
}

export function ProposalTermsPage({
  terms,
  page,
  pageCount,
}: {
  terms: string[]
  page: number
  pageCount: number
}) {
  return (
    <section
      id="proposal-page-terms"
      data-testid="proposal-page-terms"
      data-proposal-section="Terms"
      className="flex flex-col gap-4 rounded-2xl bg-card p-6 border border-slate-200 bg-white shadow-sm sm:p-8 print:break-after-page"
    >
      <div>
        <h2 className="text-xl font-semibold">Contract terms</h2>
        <p className="mt-1 text-sm text-muted-foreground">These terms are part of the price on the scope page.</p>
      </div>
      <ol className="list-decimal space-y-3 pl-5 text-sm leading-6">
        {terms.map((term) => (
          <li key={term}>{term}</li>
        ))}
      </ol>
      <PageMark label="Terms" page={page} pageCount={pageCount} />
    </section>
  )
}

export function ProposalSignatureCopy({
  acceptWording,
  declineWording,
}: {
  acceptWording: string
  declineWording: string
}) {
  return (
    <div className="flex flex-col gap-2 border-t border-border pt-4 text-sm leading-6">
      <p data-testid="accept-wording">{acceptWording}</p>
      <p data-testid="decline-wording" className="text-muted-foreground">
        {declineWording}
      </p>
    </div>
  )
}

function PageMark({ label, page, pageCount }: { label: string; page: number; pageCount: number }) {
  return (
    <p className="text-xs tracking-[0.14em] text-muted-foreground uppercase">
      {label} · {page} of {pageCount}
    </p>
  )
}

export function pageNumber(pages: ProposalPageRef[], id: string): number {
  const index = pages.findIndex((page) => page.id === id)
  return index < 0 ? 1 : index + 1
}
