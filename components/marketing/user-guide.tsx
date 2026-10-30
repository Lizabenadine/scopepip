import type { ReactNode } from "react"
import { PrintGuideButton } from "@/components/marketing/print-guide-button"

const CONTENTS = [
  { id: "quick-start", number: "01", title: "Quick Start & Setup" },
  { id: "estimating", number: "02", title: "Estimating & Proposal Sign-Off" },
  { id: "two-sheets", number: "03", title: "The Client Sheet and the Crew Sheet" },
  { id: "schedule", number: "04", title: "From Accepted to On the Schedule" },
  { id: "field-logistics", number: "05", title: "Field Logistics & Store Lists" },
  { id: "follow-ups", number: "06", title: "Follow-ups" },
  { id: "invoices", number: "07", title: "Invoices and the Deposit" },
  { id: "actuals", number: "08", title: "Actuals Tracking & Adaptive Rate Cards" },
] as const

const ROLES = [
  {
    name: "Owner",
    body: "Full access. The owner opens the dashboard, sales, jobs, invoices, settings, the rate card, and the hours on a finished job.",
  },
  {
    name: "Estimator",
    body: "Sales and take-offs. An estimator writes the bid, sets color and sheen, opens the store list, and can change the notes on the work order. Margins, unit costs, the rate card, company financials, and crew dispatch stay hidden.",
  },
  {
    name: "Project manager",
    body: "Work orders and logistics. A project manager signs in to the work order list, checks each job, and opens progress jobs and invoices. The crew uses the printed sheet. That sheet leaves prices, costs, and margins off.",
  },
] as const

export function UserGuide() {
  return (
    <div className="text-slate-700 print:text-slate-900">
      <style>{PRINT_PAGE}</style>
      <div className="mb-6 flex justify-end print:hidden">
        <PrintGuideButton />
      </div>
      <div className="grid gap-8 lg:grid-cols-[16rem_minmax(0,1fr)] lg:items-start lg:gap-12 print:block">
        <GuideNav />
        <article>
          <header className="border-b border-slate-200 pb-8">
            <p className="text-xs font-semibold tracking-[0.18em] text-cyan-700 uppercase">Scopepipe</p>
            <h1 className="mt-3 text-4xl font-bold tracking-tight text-slate-950">Help</h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600">
              Set up the company, price each room, lock the color and sheen, hand the paint counter a buy list, and use a finished room’s hours on the next room of that size.
            </p>
          </header>
          <GuideSection id="quick-start" number="01" title="Quick Start & Setup">
            <Step
              n="1"
              title="Start the company"
              body="On the home page, choose Start 14-Day Free Trial. The trial is 14 days and does not ask for a card. After the trial, the plan is $49 a month and includes 3 seats. The owner is one of them."
            />
            <Step
              n="2"
              title="Put the company on the paperwork"
              body="Open Settings, then Company. Enter the company name, the business phone, and the email proposals should come from. That name shows on proposals, crew sheets, and invoices."
            />
            <Step
              n="3"
              title="Set the rate card"
              body="Open Settings, then App, and find Time-based rates. A rate is how far the crew gets in an hour at a comfortable speed for that coat count. Walls start at the default speed. Change a coat speed when the crew works faster or slower than that default."
            />
            <Step
              n="4"
              title="Name the paint lines"
              body="The card starts as Wall paint, Ceiling paint, Trim paint, and Cabinet paint. Rename a line to the product you buy. A Sherwin-Williams, Benjamin Moore, or Dunn-Edwards name is what the store list and the crew sheet print."
            />
            <h3 className="pt-2 text-lg font-semibold text-slate-950">Who can sign in</h3>
            <ul className="grid gap-3">
              {ROLES.map((role) => (
                <li key={role.name} className="rounded-2xl border border-slate-200 bg-white p-4">
                  <h3 className="font-semibold text-slate-950">{role.name}</h3>
                  <p className="mt-1 text-sm leading-6">{role.body}</p>
                </li>
              ))}
            </ul>
            <p className="text-sm leading-6">
              Under People, on the Company tab, the owner adds the other two seats and picks the role. Each person signs in with their own password.
            </p>
            <p className="text-sm leading-6">
              Email, texts, card payments, and job photos connect from Settings. Each one needs its own key.
            </p>
          </GuideSection>
          <GuideSection id="estimating" number="02" title="Estimating & Proposal Sign-Off">
            <Step
              n="1"
              title="Open a take-off"
              body="Choose New estimate, or open Sales and then Estimator. Name the job, choose the client, and type the address."
            />
            <Step
              n="2"
              title="Measure the rooms"
              body="Add each room with its length, width, and height. Mark the walls, ceiling, and trim, and set the coats. Count the windows and the doors. The price changes as you add rooms."
            />
            <Tip>One door is one side of the door and the frame. Count both sides when the crew paints both. A single count is the bid that comes out light.</Tip>
            <Step
              n="3"
              title="Lock color and sheen"
              body="On each room, enter the color name, the color code, and the sheen. Those specs sit on the proposal the client signs, and they copy onto the crew packet. A room left blank is the one the crew has to guess."
            />
            <Step
              n="4"
              title="Add a line that is not a room"
              body="A repair or a set of shelves is a line item. Under Line items, choose Hourly Rate, Quantity, or Custom, then name the line. Photo on the proposal and Video on the proposal attach to that line. Save the estimate before adding a video. The customer plays it on the proposal."
            />
            <Step
              n="5"
              title="Send the proposal"
              body="Save, then open Proposal. PDF downloads the file. Email proposal sends the link and the PDF when the client has an email. The customer opens the link, accepts, and signs."
            />
            <Tip>Sign the color and sheen with the client before the first coat. The signed room is the spec the crew paints.</Tip>
          </GuideSection>
          <GuideSection id="two-sheets" number="03" title="The Client Sheet and the Crew Sheet">
            <Step
              n="1"
              title="The sheet the client sees"
              body="Open the proposal. The page includes a card titled Work order for the client. It shows the company, the client, the address, each room, the product, the coats, the color, and the price for that room. The same card is on the link the customer opens."
            />
            <Step
              n="2"
              title="The sheet the crew prints"
              body="The crew sheet is a different page. Open Jobs, then Work Orders, and open the job. That sheet lists the rooms, the surfaces, the color, and the notes. It does not list prices, costs, or margins. The project manager signs in to that list and checks each job. The estimator can open the same sheet and change the notes."
            />
            <Tip>Print the client card from the proposal. Print the crew sheet from Work Orders. They are not the same page.</Tip>
          </GuideSection>
          <GuideSection id="schedule" number="04" title="From Accepted to On the Schedule">
            <Step
              n="1"
              title="Put a day on the job"
              body="After the client accepts, open the job and choose Move forward. When the next column is scheduled, Schedule job asks for the day on site. You can change that day from the estimate."
            />
            <Step
              n="2"
              title="Name the crew lead"
              body="Open Jobs, then Dispatch & Map, then Crew board. On that job, pick the crew lead. The owner or the project manager does this. An estimator does not open dispatch."
            />
            <Step
              n="3"
              title="Open the crew sheet"
              body="The crew sheet is there once the job has a day. Open Jobs, then Work Orders, and open the job."
            />
          </GuideSection>
          <GuideSection id="field-logistics" number="05" title="Field Logistics & Store Lists">
            <Step
              n="1"
              title="Open the store list"
              body="On the estimate, choose Store list. The same link is on the work order. The list is one page: the product, the gallons, and the rooms that use it."
            />
            <Step
              n="2"
              title="Buy whole gallons"
              body="Each product shows the gallons the estimate counted and the gallons to buy, rounded up to the next whole gallon. Prep and surfaces with no paint are left off. Prices are left off."
            />
            <Step
              n="3"
              title="Hand it to the counter or the crew lead"
              body="Print the list before anyone drives. The paint counter sees what to pull. The crew lead sees which rooms use which product."
            />
            <Step
              n="4"
              title="Switch the crew sheet"
              body="Open Jobs, then Work Orders, and open the job. At the top of the sheet, choose English or Español. The labels and the notes switch. Print uses the language on the screen. Scopepipe remembers that choice for this login."
            />
            <Tip>Keep prices hidden on crew sheets. The sheet lists the rooms, the surfaces, the color, and the notes. It does not list prices, costs, or margins.</Tip>
          </GuideSection>
          <GuideSection id="follow-ups" number="06" title="Follow-ups">
            <Step
              n="1"
              title="Open the sequences"
              body="Open Daily, then Follow-ups. Every column follows up on its own. A sent quote gets a note the next day, again at three days, and again at a week, each with the proposal link."
            />
            <Step
              n="2"
              title="Turn a sequence on"
              body="Check Send this sequence on the ones you want, then choose Save sequences. Cold and warm leads use their own cadence. A finished job asks for a review the next day. A reply or a booked visit stops a pursuit."
            />
            <Step
              n="3"
              title="Where the messages go"
              body="Until email and text sending are connected, the messages stay on the deal. A client set to Español receives the built-in note in Spanish."
            />
          </GuideSection>
          <GuideSection id="invoices" number="07" title="Invoices and the Deposit">
            <Step
              n="1"
              title="When an invoice appears"
              body="An accepted job shows up as an invoice. A job with a deposit recorded does too."
            />
            <Step
              n="2"
              title="Open the list"
              body="Open Documents, then Invoices & Payments. Each card shows the invoice number, the client, the job, and a badge: Paid, Deposit paid, or Due."
            />
            <Step
              n="3"
              title="Read the balance"
              body="The items are the rooms and the extra lines. Under that are the subtotal, any tax, discount, deposit, or credit, and the balance due. The customer accepts the proposal before that payment."
            />
          </GuideSection>
          <GuideSection id="actuals" number="08" title="Actuals Tracking & Adaptive Rate Cards">
            <Step
              n="1"
              title="Open the finished job"
              body="Move the job to Completed, then open the estimate. Hours from this job sits under the rooms. The owner enters them. An estimator and a project manager do not see that block."
            />
            <Step
              n="2"
              title="Enter the hours"
              body="The screen shows the hours the estimate used. Type the hours that room took, then choose Save this speed. This job’s price stays as it was."
            />
            <Step
              n="3"
              title="The next room of that size"
              body="The next bedroom with the same length, width, and height uses that speed for walls, ceilings, trim, and counted items. A room with different dimensions stays on the rate card. Choose Use the rate card again if the hours were wrong."
            />
            <Tip>A slower room lowers square feet per hour. Primer speed stays on the rate card. Only the finish coats on that room size change.</Tip>
          </GuideSection>
        </article>
      </div>
    </div>
  )
}

function GuideNav() {
  return (
    <>
      <details className="rounded-2xl border border-slate-200 bg-white print:hidden lg:hidden">
        <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-slate-950">On this page</summary>
        <ContentsList />
      </details>
      <nav aria-label="On this page" className="sticky top-4 hidden lg:block print:hidden">
        <p className="text-xs font-semibold tracking-[0.16em] text-slate-500 uppercase">On this page</p>
        <ContentsList />
      </nav>
    </>
  )
}

function ContentsList() {
  return (
    <ol className="mt-3 flex flex-col gap-1 px-2 pb-3 lg:px-0 lg:pb-0">
      {CONTENTS.map((item) => (
        <li key={item.id}>
          <a href={`#${item.id}`} className="flex gap-3 rounded-xl px-2 py-2 text-sm text-slate-600 hover:bg-slate-100 hover:text-slate-950">
            <span className="text-cyan-700">{item.number}</span>
            <span>{item.title}</span>
          </a>
        </li>
      ))}
    </ol>
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
    <section id={id} className="mt-12 scroll-mt-24 border-t border-slate-200 pt-8">
      <p className="text-xs font-semibold tracking-[0.16em] text-cyan-700 uppercase">{number}</p>
      <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">{title}</h2>
      <div className="mt-6 flex flex-col gap-4">{children}</div>
    </section>
  )
}

function Step({ n, title, body }: { n: string; title: string; body: string }) {
  return (
    <div className="grid grid-cols-[2rem_minmax(0,1fr)] gap-3">
      <span className="flex size-8 items-center justify-center rounded-full bg-cyan-400 text-sm font-semibold text-slate-950">{n}</span>
      <div>
        <h3 className="font-semibold text-slate-950">{title}</h3>
        <p className="mt-1 text-sm leading-6">{body}</p>
      </div>
    </div>
  )
}

function Tip({ children }: { children: ReactNode }) {
  return (
    <aside className="rounded-2xl border border-cyan-200 bg-cyan-50 px-4 py-3 text-sm leading-6 text-slate-800">
      <p className="text-xs font-semibold tracking-[0.14em] text-cyan-800 uppercase">Pro tip</p>
      <p className="mt-1">{children}</p>
    </aside>
  )
}

const PRINT_PAGE = `
@media print {
  @page { size: letter; margin: 0.7in; }
}
`
