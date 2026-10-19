# ScopePipe

Mobile-first estimating and pipeline for painting contractors. A room's length, width, and height become wall square feet, ceiling square feet, and trim linear feet. Each surface uses a coat rate (the rate for that many full coats), hours round up, and labor is hours times the hourly rate. The customer proposal shows area prices and payment methods. The work order shows hours, products, and crew notes, and leaves prices off.

ScopePipe Field is **$49 a month**. This preview stores jobs in the browser. The production schema is in `supabase/migrations/001_scopepipe.sql`. The full plan — file tree, tables, and screen layout — is in [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Run locally

```bash
npm install
npm run dev
```

The app is served at [http://127.0.0.1:43123](http://127.0.0.1:43123).

```bash
npm test    # pricing engine
npm run lint
```

No API keys are required. Open the app and create an account. The owner sets the company name and password. A project manager is added from Settings → Company and signs in with their own email. That role is stored on the account. Clients stay hidden from a project manager even if they open `/clients`.

Each company gets its own book under `data/books`. A new account starts with a private copy of the sample jobs, with its own proposal links, so two companies do not share customers. Signing out, or opening the app in another browser without that login, shows the sign-in page and none of those jobs. Reset sample jobs on Settings → Add-ons replaces that company's book only.

Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` to upload site photos to the `site-photos` bucket, record proposal acceptance with `accept_proposal`, and assign crews with `assign_work_order`. The schema is in `supabase/migrations`. Website, Thumbtack, Angi, Google Local Services, and Facebook posts should include `?company=` set to the company slug from the website form link, or the lead stays in the spool and does not open a card.

Opening a proposal posts `open` to `/api/proposals/[id]/track`, including when the client comes back. Section views post to `/api/proposals/[id]/engagement`. Set `ENGAGEMENT_WEBHOOK_URL` to forward those events. With Supabase configured, `record_proposal_event` stores them on the proposal.

Clients open a proposal at `/p/[token]`. The page shows the company name from the painter's profile, or ScopePipe when that name is blank, plus the client, the job site, the scope, and the surface lines. Optional add-ons (trim package, pressure washing, accent wall) recalculate the total and the deposit through `calculate.ts`. Signing stores the signature, marks the proposal Accepted, and opens a crew work order with no prices. The Ortiz sample link is `/p/k7m2p9qx4n`.

After acceptance, the client pays a 20–50% deposit at `/estimates/[id]/pay`. Card, Apple Pay, and Google Pay use Stripe when `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, and `STRIPE_WEBHOOK_SECRET` are set. Without those keys, checkout uses Stripe test card `4242 4242 4242 4242` and still runs the deposit webhook. A paid deposit is recorded as Deposit Paid / Scheduled and the crew work order is created.

**Custom columns** sit on the sales and jobs boards beside the built-in stages. Add a column, rename any column, and move a card into it from Actions. A custom column does not change the stage that follow-ups use. Removing the column puts the card back on its stage. Each card shows a lead score from contact details, source, stage, a booked visit, a proposal open, a reply, and a below-minimum tag. The suggested follow-up is a draft. Send suggestion logs or sends that one message. It does not start by itself.

**Follow-ups** at `/follow-ups` are one email and text sequence per pipeline column. Cold leads get a fast cadence, warm leads a slower one, and later columns ask for a walkthrough, remind before a visit or job, nudge an open proposal, confirm an accepted job, check in while the crew is on site, and request a review after completion. The office sends the next due message while it is open. A customer reply stops that column's sequence and leaves it stopped until the deal moves. Booking a visit stops a cold, warm, estimate-requested, or proposal sequence. Nothing is delivered for real until the keys are set: email needs `RESEND_API_KEY` and `FOLLOW_UP_FROM_EMAIL` (Resend), and texts need `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, and `TWILIO_FROM_NUMBER`. Without those, the message is logged on the deal. A failed provider call waits about 15 minutes and retries.

**Clients** at `/clients/[id]` keep one history for that contact: texts, emails, proposal opens, stage changes, and notes. The contact form and the job list stay on the same page. Opening a proposal posts to `/api/proposals/[token]/track`, and that open shows on the history and on the deal.

**Financing** sits on the customer proposal under the total. The monthly payment is the standard loan payment for that total, 9.99% APR and 12 months unless Rates sets another APR, term, or lender. An apply link is shown only when it is `https`. Turning financing off on Rates hides it. It is a payment estimate, and the lender still decides.

**Past customers** can be emailed from Clients in one click. The list is clients whose job is finished and who have an email. The note asks if another room is ready. It sends through Resend when `RESEND_API_KEY` and `FOLLOW_UP_FROM_EMAIL` are set, and otherwise logs on that contact's history.

**Google Calendar** sync is on Appointments. Update Google Calendar writes visits and scheduled jobs to `/api/calendar/feed/[token]`. Subscribe to that feed from Google Calendar. Direct push runs when `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and `GOOGLE_REFRESH_TOKEN` are set, and an optional `GOOGLE_CALENDAR_ID` chooses the calendar. Without those keys the feed still updates and nothing is marked as pushed.

**QuickBooks** is on Invoices & Payments. Sync invoices creates the customer and the invoice in QuickBooks Online when `QUICKBOOKS_CLIENT_ID`, `QUICKBOOKS_CLIENT_SECRET`, `QUICKBOOKS_REFRESH_TOKEN`, and `QUICKBOOKS_REALM_ID` are set. Use `QUICKBOOKS_ENVIRONMENT=sandbox` for the sandbox host. An invoice is stored as synced only after QuickBooks returns an id.

**Zapier** takes an https Catch Hook on Rates. After it is saved, new leads, booked visits, proposal opens, acceptances, scheduled or completed jobs, and deposits post to that hook. Older history is not replayed. Send test posts one sample event.

**CompanyCam** sync uses an API token saved on Rates, or `COMPANYCAM_API_TOKEN`. Sync on a scheduled work order matches a project by street address, or by a project id already returned from CompanyCam, and pulls that project's photos onto the job. A CompanyCam link saved on the work order stays a link. It does not sync.

**Booking page** at `/book/[token]` is the public link for one lead. The lead picks a weekday or Saturday and a start time of 9:00, 10:30, 1:00, or 3:00. That request waits until the office is open, then the card moves to Estimate Scheduled, the pursuit sequence stops, and the visit reminders use that start time. Cold and estimate-requested messages include the link as `{book}`. The office card links to the same page. An accepted job does not move.

**Appointments** at `/appointments` is the office calendar for estimate visits. Booking a visit from a deal asks for a day and a start time. The day stays on `estimateVisitOn`. The start is stored as `estimateVisitAt`, a UTC instant built from that day and time in the browser's local timezone. A before-visit email or text is due that many hours before the instant, and it still logs through the follow-up runner. A visit that only has a day, with no start time, still reminds from noon UTC. Crew jobs stay on `/calendar`.

**Inbound leads** land in Cold Leads and start that column's sequence while the office is open. The public form is `/request`. Thumbtack posts to `/api/leads/thumbtack`, Angi to `/api/leads/angi`, Google Local Services to `/api/leads/google-lsa`, and Facebook Lead Ads to `/api/leads/facebook`. A normalized post to `/api/leads/inbound` takes `source` of `website`, `thumbtack`, `angi`, `google_lsa`, or `facebook` plus a name and a phone or email. Facebook's lead-id ping, before the form answers arrive, is acknowledged and does not open a card. Set `FACEBOOK_VERIFY_TOKEN` so Facebook's subscription check can echo `hub.challenge`. Yelp, Google, and Referral stay labels on a card. ScopePipe does not call those networks.

**Inbox** at `/inbox` keeps one text thread per client. Save the business number there. Follow-up texts and office texts land on that thread. A reply, logged in the thread or posted to `/api/messages/inbound`, is matched by phone, attached to the open deal, and stops that follow-up. Unknown numbers stay in the inbox until you assign a client. Photos stay on the thread. Texts send through Twilio when `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, and `TWILIO_FROM_NUMBER` are set. Until then they are logged on the thread.

**Sales Pipeline** at `/sales-pipeline` is Cold Leads, Warm Leads, Estimate Requested, Estimate Scheduled, and Proposal Sent. **Jobs Pipeline** at `/dispatch` is Project Accepted, Project Scheduled, Project In Progress, and Project Completed. Cards show the client, lead source, tags, estimated value, and invoice balance, with Work Order, Schedule, and Add Note. Each column totals its value. Filter by lead source, date, and salesperson. The crew assignment board is the Crew board tab on Dispatch: Unscheduled, Scheduled, In Progress, and Complete. Drag a card onto a column or a crew lead, or use the selects. Assigning a crew sets `scheduled_start_date`, `assigned_crew_id`, and status on the work order and shows a notice that the lead was notified. **Calendar** at `/calendar` shows those jobs by week or month with the crew color and the site address. With Supabase configured, `assign_work_order` writes the same fields and the board listens on `work_orders` for live updates.

## Price a job

Open **Estimate** at `/estimates/new`. Add a room, or use the 12×15×8 bedroom. Walls are the perimeter times the height, the ceiling is length times width, and trim is the perimeter. Count windows and doors with the like items. Set prep intensity, the access multiplier, primer and finish coats, and the tax basis. Hours are that measurement divided by the time rate for the coat count, or the item count times hours per item, rounded up to the next half hour. The 12×15×8 bedroom at two coats is 13.5 hours: walls at 85 sq ft/hr, the ceiling at 60, baseboards at 25 ln ft/hr, two window frames at 0.5 hr each, and one door and frame at 1.5 hr. Labor is those hours times the hourly rate. Materials are a separate charge. The total, hours, and sales rate update as you type. **Proposal** is the customer view. **Work order** at `/work-orders/[id]` opens after the job is scheduled and shows dimensions, prep notes, paint specs, and target labor hours. Schedule still opens the work order from the job board.

A signed change order posts to `/api/work-orders/[id]/change-orders`. The crew sheet can start one on site: the extra scope, the amount, and the client's signature. The amount is added as a custom line, so the invoice reprices through `calculate.ts`. The crew sheet lists the added work and the time it was signed, and still leaves the price off.

`POST /api/payments/schedule` and `POST /api/estimates/calculate-milestones` turn surface quantity, coats, and a production rate into labor hours and a deposit, job-start, and completion schedule. Defaults are a $65 hourly rate and a 30/50/20 split. A new estimate includes that labor schedule under the room price: drywall at 150 sq ft/hr, siding at 120, trim at 80 linear ft/hr, and doors at 20 per hour. The customer proposal total still comes from `calculate.ts`.

Crew leads tag site photos Before, In progress, After, Prep concern, or Touch-up from the work order. Take a photo with the phone camera or pick one from the library. Prep concern attaches to the prep note, and Touch-up attaches to a line item. The same photos open in the site-photo drawer on the estimate and on each dispatch card. Uploads go through `/api/work-orders/[id]/photos`.

Company defaults (production speed, coverage, paint cost, labor cost, margins) live on **Settings**. The tabs are Company, Brand, Email, App, Calendar, Templates, Notifications, Payments, Integrations, Portal, and Add-ons. They stamp onto the next estimate. An estimate already saved keeps the rates it was priced with.
