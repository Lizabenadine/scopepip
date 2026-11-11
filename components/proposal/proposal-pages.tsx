import { CompanyMark } from "@/components/brand/company-mark"
import { money } from "@/lib/format"
import {
  paintMaterialsInclusionLabel,
  type ProposalPageRef,
  type ResolvedProposalKindTemplate,
  type ScheduledProposalProduct,
} from "@/lib/proposals/document"
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
  logoUrl,
  clientName,
  title,
  jobAddress,
  companyEmail,
  companyPhone,
  companyLicense,
  preparedOn,
  expiresOn,
  total,
  coverLine,
  templateLabel,
  page,
  pageCount,
}: {
  companyName: string
  logoUrl?: string | null
  clientName: string
  title: string
  jobAddress: string
  companyEmail: string
  companyPhone?: string
  companyLicense?: string
  preparedOn: string
  expiresOn: string | null
  total: number
  coverLine: string
  templateLabel?: string
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
        <CompanyMark
          name={companyName}
          logoUrl={logoUrl}
          testId="proposal-brand"
          className="font-display text-3xl leading-none tracking-tight text-primary"
          imageClassName="h-16"
        />
        {companyLicense ? (
          <p data-testid="proposal-company-license" className="mt-2 text-xs font-medium text-muted-foreground">
            {companyLicense}
          </p>
        ) : null}
        <p className="mt-6 text-xs font-semibold tracking-[0.14em] text-primary uppercase">
          {templateLabel ? `Proposal · ${templateLabel}` : "Proposal"}
        </p>
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
          {companyPhone ? <p className="mt-2 text-sm text-muted-foreground">{companyPhone}</p> : null}
          {companyEmail ? <p className="mt-1 text-sm text-muted-foreground">{companyEmail}</p> : null}
          <p className="mt-2 text-sm text-muted-foreground">Prepared {preparedOn}</p>
          {expiresOn ? <p className="text-sm text-muted-foreground">Price holds through {expiresOn}</p> : null}
        </div>
        <div className="sm:text-right">
          <p className="text-xs font-semibold tracking-[0.14em] text-muted-foreground uppercase">Investment</p>
          <p data-testid="proposal-cover-total" className="mt-1 font-display text-4xl text-primary tabular-nums">
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

export function ProposalTemplateSections({
  template,
  scheduledProducts,
  excludeMaterials,
  language = "en",
}: {
  template: ResolvedProposalKindTemplate
  scheduledProducts: ScheduledProposalProduct[]
  excludeMaterials?: boolean
  language?: "en" | "es"
}) {
  const materialsStatus = paintMaterialsInclusionLabel(excludeMaterials, language)
  return (
    <section
      data-testid="proposal-template-sections"
      data-proposal-section="Preparation and specifications"
      className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8"
    >
      <div>
        <p className="text-xs font-semibold tracking-[0.14em] text-primary uppercase">{template.label}</p>
        <h2 className="mt-1 text-xl font-semibold">Preparation, Materials, Exclusions &amp; Warranty</h2>
        <p className="mt-1 text-sm text-muted-foreground">{template.scopeOverview}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div
          data-testid="proposal-section-preparation"
          className="rounded-xl border border-slate-200 bg-slate-50/70 p-4"
        >
          <h3 className="text-xs font-bold tracking-wider text-slate-700 uppercase">
            Preparation Procedures
          </h3>
          <ul className="mt-2 list-disc space-y-1.5 pl-4 text-sm leading-6 text-slate-800">
            {template.preparation.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>

        <div
          data-testid="proposal-section-materials"
          className="rounded-xl border border-slate-200 bg-slate-50/70 p-4"
        >
          <h3 className="text-xs font-bold tracking-wider text-slate-700 uppercase">
            Materials &amp; Paint System
          </h3>
          <p
            data-testid="proposal-materials-status"
            className="mt-2 text-xs font-semibold text-slate-700"
          >
            {materialsStatus.detail}
          </p>
          {scheduledProducts.length > 0 ? (
            <div className="mt-2 rounded-lg border border-slate-200 bg-white p-3">
              <p className="text-xs font-semibold text-slate-500 uppercase">Scheduled Products on This Job</p>
              <ul className="mt-1.5 space-y-1 text-sm text-slate-900" data-testid="proposal-scheduled-products">
                {scheduledProducts.map((product) => (
                  <li key={product.productName}>
                    <span className="font-semibold">{product.productName}</span>
                    {product.details.length > 0 ? (
                      <span className="text-slate-600"> — {product.details.join("; ")}</span>
                    ) : null}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          <ul className="mt-2 list-disc space-y-1.5 pl-4 text-sm leading-6 text-slate-800">
            {template.materials.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      </div>

      <div
        data-testid="proposal-section-exclusions"
        className="rounded-xl border border-slate-200 bg-slate-50/70 p-4"
      >
        <h3 className="text-xs font-bold tracking-wider text-slate-700 uppercase">Exclusions</h3>
        <ul className="mt-2 list-disc space-y-1.5 pl-4 text-sm leading-6 text-slate-800">
          {template.exclusions.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div
          data-testid="proposal-section-warranty"
          className="rounded-xl border border-slate-200 bg-slate-50/70 p-4"
        >
          <h3 className="text-xs font-bold tracking-wider text-slate-700 uppercase">Warranty</h3>
          <p className="mt-2 text-sm leading-6 text-slate-800">{template.warranty}</p>
        </div>

        <div
          data-testid="proposal-section-payment-terms"
          className="rounded-xl border border-slate-200 bg-slate-50/70 p-4"
        >
          <h3 className="text-xs font-bold tracking-wider text-slate-700 uppercase">Payment Terms</h3>
          <p className="mt-2 text-sm leading-6 text-slate-800">{template.paymentTerms}</p>
        </div>
      </div>
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
