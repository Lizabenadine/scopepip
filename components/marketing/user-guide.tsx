import type { ReactNode } from "react"
import { LogoHeader } from "@/components/brand/brand-logo"
import { PrintGuideButton } from "@/components/marketing/print-guide-button"

const CONTENTS = [
  { id: "getting-started", title: "Getting started" },
  { id: "creating-estimates", title: "Writing an estimate" },
  { id: "client-work-order", title: "Work order for the client" },
  { id: "store-list", title: "Store list" },
  { id: "crew-language", title: "English or Spanish on the crew sheet" },
  { id: "finished-hours", title: "Hours from a finished job" },
  { id: "invoices", title: "Invoices" },
] as const

export function UserGuide() {
  return (
    <div className="min-h-dvh bg-[#0B0F17] text-slate-300 print:bg-white print:text-slate-900">
      <style>{PRINT_PAGE}</style>
      <LogoHeader>
        <PrintGuideButton />
      </LogoHeader>
      <div className="mx-auto max-w-[820px] px-4 py-8 print:max-w-none print:p-0">
        <article className="bg-white px-6 py-10 shadow-[0_12px_40px_rgba(15,23,42,0.08)] sm:px-12 sm:py-14 print:shadow-none">
          <header className="border-b border-slate-200 pb-8">
            <p className="text-xs font-bold tracking-[0.18em] text-cyan-700 uppercase">Scopepipe</p>
            <h1 className="mt-3 font-display text-4xl tracking-tight text-slate-950">User Guide</h1>
            <p className="mt-3 max-w-xl text-base leading-7 text-slate-600">
              Open the company, price a job, hand the client a filled work order, print the store list, and use a
              finished room’s hours on the next room of that size.
            </p>
          </header>
          <nav aria-label="Contents" className="mt-8">
            <h2 className="text-xs font-bold tracking-[0.16em] text-slate-400 uppercase">Contents</h2>
            <ol className="mt-3 grid gap-2 sm:grid-cols-2">
              {CONTENTS.map((item, index) => (
                <li key={item.id}>
                  <a href={`#${item.id}`} className="flex gap-3 rounded-xl border border-slate-200 px-3 py-3 text-sm font-medium hover:border-slate-300">
                    <span className="text-slate-400">{index + 1}</span>
                    <span>{item.title}</span>
                  </a>
                </li>
              ))}
            </ol>
          </nav>
          <GuideSection id="getting-started" number="01" title="Getting started">
            <Step
              n="1"
              title="Start the company"
              body="On the home page, choose Start 14-Day Free Trial. That opens signup for the company login. The trial is 14 days and does not ask for a card. After the trial, the plan is $49 a month."
            />
            <Step
              n="2"
              title="Sign in as the owner"
              body="The person who creates the company is the owner. Sign in with that email and password. The owner sees the dashboard, sales, jobs, and settings."
            />
            <Step
              n="3"
              title="Put the company name on the paperwork"
              body="Open Settings and enter the company name, the business phone, and the email proposals should come from. That name shows on proposals, crew sheets, and invoices."
            />
            <Step
              n="4"
              title="Add the other people"
              body="Under People, add the others who should see the jobs. They sign in with their own password and can open jobs, work orders, and invoices. The $49 plan has 3 seats. The owner is one of them. You pick who uses the other two."
            />
          </GuideSection>
          <GuideSection id="creating-estimates" number="02" title="Writing an estimate">
            <Step
              n="1"
              title="Open the estimator"
              body="Choose New estimate, or open Sales and then Estimator."
            />
            <Step
              n="2"
              title="Name the job"
              body="Give the job a title, choose the client, and type the address."
            />
            <Step
              n="3"
              title="Add the rooms"
              body="Add each room with its length, width, and height. Mark the walls, ceiling, and trim, and set the coats. Count the windows and the doors. One door is one side of the door and the frame. The price changes as you add rooms."
            />
            <Step
              n="4"
              title="Add a line that is not a room"
              body="A repair or a set of shelves can be its own line. You can put a photo or a video on that line. The customer sees it on the proposal."
            />
            <Step
              n="5"
              title="Save"
              body="On a new estimate, choose Save to Lead. If the job is already in the book, choose Save."
            />
            <Step
              n="6"
              title="Send the proposal"
              body="Open the proposal for that job. PDF downloads the file. Email proposal sends the link and the PDF when the client has an email. The customer opens the link, accepts, and signs."
            />
          </GuideSection>
          <GuideSection id="client-work-order" number="03" title="Work order for the client">
            <p className="text-sm leading-6 text-slate-600">
              The proposal includes a work order for the client. It is filled from the estimate. The crew sheet is a
              different page, and that page leaves the price off.
            </p>
            <Step
              n="1"
              title="Open the proposal"
              body="On the estimate, choose Proposal. The same work order is on the link the customer opens."
            />
            <Step
              n="2"
              title="What the client sees"
              body="The company name, the client, the address, each room, the product, the coats, and the price for that room. Prep notes show when the room has them."
            />
          </GuideSection>
          <GuideSection id="store-list" number="04" title="Store list">
            <p className="text-sm leading-6 text-slate-600">
              The store list is the paint to buy. It names the product, the gallons, and the rooms. It does not list
              prices.
            </p>
            <Step
              n="1"
              title="Open the list"
              body="On the estimate, choose Store list. The work order has the same link."
            />
            <Step
              n="2"
              title="Read the gallons"
              body="Each product shows the gallons the estimate counted and the gallons to buy, rounded up to the next whole gallon. Under that are the rooms that use it."
            />
            <Step
              n="3"
              title="Print it"
              body="Print and hand it to the paint store or the crew before anyone drives."
            />
          </GuideSection>
          <GuideSection id="crew-language" number="05" title="English or Spanish on the crew sheet">
            <p className="text-sm leading-6 text-slate-600">
              The crew sheet is the work order. It lists the rooms, the surfaces, and the notes. It does not list
              prices, costs, or margins.
            </p>
            <Step
              n="1"
              title="Open the sheet"
              body="Open Jobs, then Work Orders, and open the job. The sheet is there once the job is scheduled."
            />
            <Step
              n="2"
              title="Pick the language"
              body="At the top of the sheet, choose English or Español. The labels and the notes switch. The work orders list has the same switch."
            />
            <Step
              n="3"
              title="Print it"
              body="Print uses the language on the screen. Scopepipe remembers that choice for this login, so the next sheet opens the same way."
            />
            <p className="text-sm leading-6 text-slate-600">
              If a client is set to Español, that client’s proposal and follow-ups go out in Spanish. The switch on the
              crew sheet is only for the crew.
            </p>
          </GuideSection>
          <GuideSection id="finished-hours" number="06" title="Hours from a finished job">
            <p className="text-sm leading-6 text-slate-600">
              After a job, the owner can enter the hours a room actually took. The next room of that same size uses
              that speed. This job’s price stays as it was.
            </p>
            <Step
              n="1"
              title="Open the finished job"
              body="Move the job to Completed, then open the estimate. The hours block is under the rooms. A project manager does not see it."
            />
            <Step
              n="2"
              title="Enter the hours"
              body="The screen shows the hours the estimate used. Type the hours that room took, then choose Save this speed. Walls, ceilings, trim, and counted items on the next room of that size use the new speed."
            />
            <Step
              n="3"
              title="Leave other sizes alone"
              body="A room with different dimensions stays on the rate card. Choose Use the rate card again if the hours were wrong. The next room of that size goes back to the default speed."
            />
          </GuideSection>
          <GuideSection id="invoices" number="07" title="Invoices">
            <Step
              n="1"
              title="Accept the job"
              body="An accepted job shows up as an invoice. A job with a deposit recorded does too."
            />
            <Step
              n="2"
              title="Open Invoices & Payments"
              body="Open Documents, then Invoices & Payments. Each card is one invoice, with the number, the client, the job, and a badge: Paid, Deposit paid, or Due."
            />
            <Step
              n="3"
              title="Read the items"
              body="The items are the rooms and the extra lines, with the quantity and the coats. Under that are the subtotal, any tax, discount, deposit, or credit, and the balance due."
            />
            <Step
              n="4"
              title="Print, or take the deposit"
              body="Print prints the invoices. If a balance is still open, open that invoice to take the deposit. The customer accepts the proposal before that payment."
            />
          </GuideSection>
        </article>
      </div>
    </div>
  )
}

function GuideSection({
  id,
  number,
  title,
  children,
}: {
  id: string
  number: string
  title: string
  children: ReactNode
}) {
  return (
    <section id={id} className="mt-12 break-inside-avoid border-t border-slate-200 pt-8">
      <p className="text-xs font-bold tracking-[0.16em] text-cyan-700 uppercase">{number}</p>
      <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">{title}</h2>
      <div className="mt-5 flex flex-col gap-4">{children}</div>
    </section>
  )
}

function Step({ n, title, body }: { n: string; title: string; body: string }) {
  return (
    <div className="grid grid-cols-[2rem_minmax(0,1fr)] gap-3">
      <span className="flex size-8 items-center justify-center rounded-full bg-slate-950 text-sm font-semibold text-white">
        {n}
      </span>
      <div>
        <h3 className="font-semibold text-slate-950">{title}</h3>
        <p className="mt-1 text-sm leading-6 text-slate-600">{body}</p>
      </div>
    </div>
  )
}

const PRINT_PAGE = `
@media print {
  @page { size: letter; margin: 0.7in; }
}
`
