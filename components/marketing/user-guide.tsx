"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import {
  BookOpen,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  CreditCard,
  FileText,
  Funnel,
  HelpCircle,
  Languages,
  Mic,
  Pencil,
  Search,
  ShoppingCart,
  Sparkles,
  Users,
  X,
} from "lucide-react"
import { PrintGuideButton } from "@/components/marketing/print-guide-button"

interface GuideStep {
  n: string
  title: string
  body: string
}

interface GuideTopic {
  id: string
  number: string
  title: string
  category: string
  icon: typeof Sparkles
  description: string
  keywords: string
  appLink?: { label: string; href: string }
  steps: GuideStep[]
  tip?: string
}

const CATEGORIES = [
  "All",
  "Getting Started",
  "Estimating",
  "Proposals",
  "Sketch & Notes",
  "Voice Notes",
  "Paint Buy Lists",
  "Sales Pipeline",
  "Work Orders",
  "Spanish Crew Sheets",
  "Team & Roles",
  "Billing & Plans",
] as const

const GUIDES: GuideTopic[] = [
  {
    id: "quick-start",
    number: "01",
    title: "Quick Start & Company Setup",
    category: "Getting Started",
    icon: Sparkles,
    description: "Set up company information, logo, phone number, and establish your production rate card.",
    keywords: "setup trial company settings rate card speed logo phone email address branding integrations",
    appLink: { label: "Open Company Settings", href: "/settings" },
    steps: [
      {
        n: "1",
        title: "Start your 14-day free trial",
        body: "Choose 'Start 14-Day Free Trial' on the Scopepipe home page. The trial provides full access to mobile room estimating, proposals, buy lists, and sales pipeline without requiring a credit card.",
      },
      {
        n: "2",
        title: "Put your company on the paperwork",
        body: "Open Settings, then Company. Enter your company name, business phone, license number, and the email address proposals should come from. That branding automatically appears on client proposals, crew sheets, and invoices.",
      },
      {
        n: "3",
        title: "Set your production rate card",
        body: "Open Settings, then App, and find Time-based rates. A rate is how many square feet the crew coats in an hour at a comfortable pace. Walls, ceilings, and trim start at default painting speeds; adjust coat speeds to match your crew's actual field tempo.",
      },
      {
        n: "4",
        title: "Name your paint products",
        body: "The rate card begins with Wall paint, Ceiling paint, Trim paint, and Cabinet paint. Rename each coating line to the exact product you buy (e.g. Sherwin-Williams SuperPaint, Benjamin Moore Regal, or Dunn-Edwards). That name is what the paint buy list and crew sheet display.",
      },
      {
        n: "5",
        title: "Connect business integrations",
        body: "Under Settings, connect Stripe for homeowner deposit payments, QuickBooks for invoice synchronization, and customer communication channels when ready.",
      },
    ],
    tip: "Complete your Company profile and Hourly Rate Card before writing your first bid so every new estimate calculates with your exact business numbers.",
  },
  {
    id: "estimating",
    number: "02",
    title: "Mobile Room-by-Room Estimating",
    category: "Estimating",
    icon: FileText,
    description: "Measure rooms, count doors and windows, set coat counts, and generate accurate bids on your phone.",
    keywords: "estimate take-off rooms address autocomplete dimensions length width height walls ceilings trim doors windows line items",
    appLink: { label: "Open Estimator", href: "/estimate" },
    steps: [
      {
        n: "1",
        title: "Start a new estimate",
        body: "Tap 'New estimate' in the top navigation bar or navigate to Sales -> Estimator. Select an existing client or enter homeowner name, phone number, and email.",
      },
      {
        n: "2",
        title: "Type job address with Google Maps autocomplete",
        body: "Begin typing the street address into the Job Address field. Real matching addresses appear automatically as you type. Tap the correct address to populate and save the complete street, city, state, and zip code, with full 'Navigate to Jobsite' map support.",
      },
      {
        n: "3",
        title: "Add and measure rooms",
        body: "Add each room by entering Length, Width, and Ceiling Height in feet. Check the surfaces to paint (walls, ceilings, trim, baseboards) and select 1 or 2 coats. The estimate dollar total updates in real-time as you walk the house.",
      },
      {
        n: "4",
        title: "Count doors, windows, and openings",
        body: "Count each door opening and window casing. Add closets or built-in cabinets as needed. Scopepipe deducts surface cutouts and factors frame prep into your total price automatically.",
      },
      {
        n: "5",
        title: "Lock color and sheen per surface",
        body: "For each surface, type the color name, color code (e.g. SW 7005 Pure White), and sheen (Flat, Matte, Eggshell, Satin, Semi-Gloss). These specifications display on the homeowner proposal and copy directly onto the crew work order.",
      },
      {
        n: "6",
        title: "Add non-room line items",
        body: "Under Line items, add custom charges for drywall patching, wallpaper removal, power washing, or hourly carpentry. Choose Hourly Rate, Fixed Quantity, or Custom flat fee.",
      },
    ],
    tip: "One door count represents one side and casing. Count two doors when the crew paints both sides of a passage door.",
  },
  {
    id: "proposals",
    number: "03",
    title: "Proposals, Digital Signatures & Deposits",
    category: "Proposals",
    icon: CheckCircle2,
    description: "Deliver professional proposals, collect legally binding electronic signatures, and accept deposits online.",
    keywords: "proposal contract signature sign deposit pdf video accept send client email approve review",
    appLink: { label: "View Proposals", href: "/proposal" },
    steps: [
      {
        n: "1",
        title: "Review proposal breakdown",
        body: "Save your estimate, then open Proposal. Review the executive client summary, surface preparation scope, room-by-room breakdown, and payment terms.",
      },
      {
        n: "2",
        title: "Attach video walkthroughs (Pro & Business)",
        body: "On Pro and Business plans, attach video walkthrough links or clips to proposal line items so homeowners can re-watch specific project details on their phone before approving.",
      },
      {
        n: "3",
        title: "Send via email or copy private link",
        body: "Choose 'Email proposal' to deliver the proposal PDF and interactive approval link directly to the customer, or copy the link to text it to the client.",
      },
      {
        n: "4",
        title: "Homeowner electronic signature",
        body: "The customer opens the link on mobile or desktop, reviews room specs, draws their signature on screen, and accepts the proposal. You receive immediate notification when the contract is signed.",
      },
      {
        n: "5",
        title: "Collect initial deposit",
        body: "Homeowners can pay their deposit online immediately via credit card checkout, or you can record a check or cash deposit manually under Payments.",
      },
      {
        n: "6",
        title: "Print or export proposal PDF",
        body: "Tap 'PDF' or 'Print' at any time to generate an executive vector PDF proposal suitable for printing or client record-keeping.",
      },
    ],
    tip: "Have the homeowner confirm color and sheen before work begins. The signed proposal locks the exact spec the crew paints.",
  },
  {
    id: "sketch-notes",
    number: "04",
    title: "Daily Sketch & Notes (Photo Markup & Text Tool)",
    category: "Sketch & Notes",
    icon: Pencil,
    description: "Draw room layouts, markup jobsite repair photos, type text notes, stamp dimensions, and print specs.",
    keywords: "sketch notes photo markup draw canvas text text tool pen eraser print pdf attach dimensions patch repair standalone",
    appLink: { label: "Open Sketch & Notes", href: "/sketches" },
    steps: [
      {
        n: "1",
        title: "Open Sketch & Notes anytime",
        body: "Access Sketch & Notes directly from the main navigation at '/sketches' or inside any estimate room. You can create standalone sketches on the go without creating an estimate first.",
      },
      {
        n: "2",
        title: "Freehand finger and stylus drawing",
        body: "Select Pen or Eraser with Fine, Medium, or Thick stroke widths. Choose high-contrast drawing colors (Cyan, Yellow, Red, White, Black) optimized for phone screens and outdoor contrast.",
      },
      {
        n: "3",
        title: "Jobsite photo markup",
        body: "Tap 'Photo Markup' to take a photo with your phone camera or upload an image. The photo fits directly onto the sketchpad so you can draw arrows and highlight drywall cracks, water damage, or accent walls.",
      },
      {
        n: "4",
        title: "Type and move text with the Text Tool",
        body: "Tap the 'Text' button beside Pen and Eraser, then tap anywhere on canvas to type text notes. Drag the handle to move text anywhere. Double-click to edit or tap trash to delete.",
      },
      {
        n: "5",
        title: "Stamp quick dimensions and repair badges",
        body: "Use quick stamp buttons to stamp room dimensions (📐 12' × 14'), drywall patches (⚠️ Patch/Repair), doors (🚪 Door), windows (🪟 Window), or custom notes directly onto the drawing.",
      },
      {
        n: "6",
        title: "Print or save as PDF",
        body: "Tap 'Print / PDF' beside Save Sketch to print a clean single-page job sheet with the sketch title, room dimensions, full drawing, and written instructions, or save it as a PDF via your browser's print dialog.",
      },
      {
        n: "7",
        title: "Attach standalone sketches to a job",
        body: "Sketches created from the Daily menu save locally. Tap 'Attach to Job' on any sketch card to link it to an existing client estimate and room.",
      },
      {
        n: "8",
        title: "Private internal note vs proposal",
        body: "Sketches remain private internal notes by default. Check 'Include in Proposal' only if you want the annotated markup visible on the customer's proposal.",
      },
    ],
    tip: "Use the Red or Yellow pen over dark photos for high visibility, and tap 'Print / PDF' to hand the crew lead an 8.5x11 repair diagram.",
  },
  {
    id: "voice-notes",
    number: "05",
    title: "Voice-to-Estimate Notes (Business Plan)",
    category: "Voice Notes",
    icon: Mic,
    description: "Dictate room instructions and prep notes hands-free using browser audio transcription on the Business plan.",
    keywords: "voice mic microphone dictate speech transcribe audio business notes hands-free room prep",
    appLink: { label: "Open Estimator", href: "/estimate" },
    steps: [
      {
        n: "1",
        title: "Available on the Business plan",
        body: "Voice-to-Estimate notes are an exclusive feature of the Business tier ($79/month), designed for contractors who want to record field observations hands-free.",
      },
      {
        n: "2",
        title: "Locate the microphone icon in any room",
        body: "While walking a property, open any room in the estimator and locate the microphone button beside the room notes field.",
      },
      {
        n: "3",
        title: "Tap to record and speak naturally",
        body: "Tap the mic and describe the room's conditions (e.g., 'Heavy caulking needed along crown molding, two coats satin finish on walls, baseboards need scuff sanding').",
      },
      {
        n: "4",
        title: "Automatic transcription",
        body: "Tap stop when finished speaking. Scopepipe transcribes your audio directly into clean, formatted written room notes.",
      },
      {
        n: "5",
        title: "Syncs directly to crew sheets",
        body: "Dictated room instructions save with the estimate and transfer directly onto the work order and crew sheet so nothing is forgotten.",
      },
    ],
    tip: "Speak room measurements and surface prep details while walking between rooms to complete whole-house bids in under 10 minutes.",
  },
  {
    id: "paint-buy-lists",
    number: "06",
    title: "Paint Buy Lists & Store Orders",
    category: "Paint Buy Lists",
    icon: ShoppingCart,
    description: "Generate exact gallon counts rounded up to whole gallons for the paint counter or crew lead.",
    keywords: "store list paint buy list gallons sherwin williams benjamin moore dunn edwards material counter whole gallons",
    appLink: { label: "Open Estimator", href: "/estimate" },
    steps: [
      {
        n: "1",
        title: "Open the Store List",
        body: "On any estimate or work order, tap 'Store list'. The buy list opens as a concise, one-page material breakdown.",
      },
      {
        n: "2",
        title: "Whole gallon rounding",
        body: "Scopepipe calculates total surface area, divides by standard coverage rates per coat, and rounds up to the next whole gallon so you never run out on site.",
      },
      {
        n: "3",
        title: "Grouped by product and sheen",
        body: "Products are organized by Wall paint, Ceiling paint, Primer, and Trim enamel, showing the exact color name, color code, sheen, and which rooms use each gallon.",
      },
      {
        n: "4",
        title: "Price-free for the paint counter",
        body: "Print or show the store list on your phone at Sherwin-Williams or Benjamin Moore. Labor hours, client pricing, and profit margins are completely hidden.",
      },
    ],
    tip: "Print the Store List before leaving the office so the paint store can pull and tint all gallons while the crew sets up drop cloths.",
  },
  {
    id: "sales-pipeline",
    number: "07",
    title: "Sales Pipeline & Smart Follow-ups",
    category: "Sales Pipeline",
    icon: Funnel,
    description: "Track leads from cold inquiry to won job with automated 3-day and 7-day reminders and CRM metrics.",
    keywords: "sales pipeline kanban crm leads follow-up reminders 3-day 7-day deal stage win lost revenue",
    appLink: { label: "Open Sales Pipeline", href: "/sales-pipeline" },
    steps: [
      {
        n: "1",
        title: "Access your visual pipeline",
        body: "Open Sales -> Sales Pipeline to view your Kanban board organized into Cold Leads, Proposal Sent, Follow-up, and Won / Accepted stages.",
      },
      {
        n: "2",
        title: "Add incoming leads fast",
        body: "When a homeowner calls or texts, tap '+ New Lead'. Enter their name, phone number, and address to create an immediate deal card on the board.",
      },
      {
        n: "3",
        title: "Drag and drop stage progression",
        body: "Drag deal cards across columns as you schedule appointments, deliver proposals, and close sales. Cards show client name, job address, and proposal amount.",
      },
      {
        n: "4",
        title: "Smart 3-day & 7-day follow-up reminders",
        body: "Sent proposals automatically trigger reminders at 3 days and 7 days. Tap a reminder for 1-click text and email follow-up templates including the proposal link.",
      },
      {
        n: "5",
        title: "Monitor key business metrics",
        body: "Top metric cards track New Leads, Proposals Sent, Accepted Projects, and Total Pipeline Dollar Value in real-time.",
      },
    ],
    tip: "Consistently follow up on proposals at day 3 and day 7. Most painting bids close on the second or third touchpoint.",
  },
  {
    id: "work-orders",
    number: "08",
    title: "Work Orders & Jobsite Logistics",
    category: "Work Orders",
    icon: ClipboardList,
    description: "Turn accepted proposals into actionable crew packets with prep notes, schedules, and punchlists.",
    keywords: "work order job schedule dispatch crew prep notes exclusions punchlist project manager crew lead",
    appLink: { label: "Open Work Orders", href: "/work-orders" },
    steps: [
      {
        n: "1",
        title: "Access active work orders",
        body: "Open Jobs -> Work Orders. Any accepted estimate automatically generates an active work order containing all room specs, colors, and notes.",
      },
      {
        n: "2",
        title: "Schedule the job on-site date",
        body: "Open the work order and tap 'Move forward' to set the scheduled start date. Scheduled dates reflect on your Dispatch & Map board.",
      },
      {
        n: "3",
        title: "Assign a crew lead",
        body: "Under Jobs -> Dispatch & Map, assign the project to a specific crew lead. The crew lead sees their upcoming jobs and room requirements.",
      },
      {
        n: "4",
        title: "Set prep instructions and exclusions",
        body: "Specify clear surface preparation notes (e.g. pressure washing, wood filler, masking) and project exclusions so crews know exactly what is included.",
      },
      {
        n: "5",
        title: "Price-free crew protection",
        body: "The crew sheet lists surfaces, colors, and instructions, but keeps pricing, profit margins, and homeowner billing strictly confidential.",
      },
    ],
    tip: "Print the crew sheet from Work Orders, not from Proposals. Work orders leave financial margins off so your painters focus strictly on craftsmanship.",
  },
  {
    id: "spanish-crew",
    number: "09",
    title: "Spanish Crew Sheets & Bilingual Mode",
    category: "Spanish Crew Sheets",
    icon: Languages,
    description: "Toggle work orders and crew packets into Spanish with one click for Hispanic paint crews.",
    keywords: "spanish español bilingual crew sheet traducción language idioms orden de trabajo hispanic",
    appLink: { label: "Open Work Orders", href: "/work-orders" },
    steps: [
      {
        n: "1",
        title: "One-tap language toggle",
        body: "Click 'English / Español' in the top navigation header or at the top of any work order to switch language instantly.",
      },
      {
        n: "2",
        title: "Industry-standard painting translations",
        body: "Scopepipe translates trade terms accurately: Walls become Paredes, Ceilings become Techos, Trim becomes Molduras, Doors become Puertas, Windows become Ventanas, and Primer becomes Imprimador.",
      },
      {
        n: "3",
        title: "Enter bilingual prep notes",
        body: "Enter dedicated Spanish instructions in the Spanish prep notes field (`prepNotesEs`) so your Hispanic crew lead receives clear directions in their primary language.",
      },
      {
        n: "4",
        title: "Print Spanish crew sheets",
        body: "Print directly while viewing in Español. The printed packet formats cleanly in Spanish with all pricing and company financials safely omitted.",
      },
      {
        n: "5",
        title: "Saved per user login",
        body: "Scopepipe remembers the selected language for each team member login so bilingual project managers can stay in Spanish permanently.",
      },
    ],
    tip: "Providing crew sheets in Spanish eliminates communication errors, wrong sheen applications, and missed prep steps on site.",
  },
  {
    id: "team-management",
    number: "10",
    title: "Team Management & User Roles",
    category: "Team & Roles",
    icon: Users,
    description: "Manage team seats, permissions, and roles between Owner, Estimator, and Project Manager.",
    keywords: "team seats roles permissions owner estimator project manager invite users accounts",
    appLink: { label: "Manage Team", href: "/settings" },
    steps: [
      {
        n: "1",
        title: "Open Team Settings",
        body: "Navigate to Settings -> Company and scroll down to the Team & Seats panel.",
      },
      {
        n: "2",
        title: "Understand role permissions",
        body: "Scopepipe provides three purpose-built roles: Owner (full access to all screens, financial margins, rate cards, billing, and team seats), Estimator (mobile estimating, takeoffs, proposals, store lists, and client contacts; margins, company financials, and rate cards stay hidden), and Project Manager (work orders, progress jobs, crew dispatch, and invoices; rate cards stay hidden).",
      },
      {
        n: "3",
        title: "Check included seat limits",
        body: "Starter includes 1 seat (the owner). Pro includes 3 included seats. Business includes 5 included seats with the ability to purchase additional seats.",
      },
      {
        n: "4",
        title: "Invite team members",
        body: "Enter member name, email address, and select their role (Estimator or Project Manager). Each team member signs in with their own password.",
      },
      {
        n: "5",
        title: "Purchase additional Business seats",
        body: "Business plan customers can add extra seats beyond the 5 included seats for $10/month per seat, billed securely through Paddle.",
      },
    ],
    tip: "Assign the Estimator role to sales reps so they can write bids on site without ever seeing your company profit margins or production costs.",
  },
  {
    id: "billing-plans",
    number: "11",
    title: "Plans, Pricing & Paddle Subscriptions",
    category: "Billing & Plans",
    icon: CreditCard,
    description: "Understand the three subscription tiers, monthly/annual billing, extra seats, and managing payments.",
    keywords: "billing pricing subscription paddle starter pro business checkout upgrade seats invoice annual monthly card",
    appLink: { label: "View Plans & Pricing", href: "/pricing" },
    steps: [
      {
        n: "1",
        title: "Choose the right subscription tier",
        body: "Scopepipe offers three straightforward subscription plans: Starter ($29/mo or $290/yr) includes 1 seat, room estimating, proposals, buy lists, pipeline, Spanish crew sheets, and Sketch & Notes; Pro ($49/mo or $490/yr - Most Popular) includes 3 seats and adds video proposals; Business ($79/mo or $790/yr) includes 5 seats and adds Voice-to-Estimate notes and smart reminders.",
      },
      {
        n: "2",
        title: "14-day free trial on signup",
        body: "Every new company begins with an unrestricted 14-day free trial without entering credit card details.",
      },
      {
        n: "3",
        title: "Annual billing discount",
        body: "Switching to annual billing saves two full months of subscription costs each year ($290/yr Starter, $490/yr Pro, $790/yr Business).",
      },
      {
        n: "4",
        title: "Adding paid Business seats",
        body: "Business plan accounts can purchase additional seats beyond the 5 included seats at $10/month per seat billed securely via Paddle.",
      },
      {
        n: "5",
        title: "Self-serve customer portal & receipts",
        body: "Manage your subscription, update credit cards, or download PDF receipts anytime via the secure Paddle customer portal link inside Settings.",
      },
    ],
    tip: "You can upgrade from Starter to Pro or Business at any time without losing any saved client records, estimates, or rate cards.",
  },
]

export function UserGuide() {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<string>("All")

  const filteredGuides = useMemo(() => {
    return GUIDES.filter((guide) => {
      // Category filter
      if (selectedCategory !== "All" && guide.category !== selectedCategory) {
        return false
      }

      // Search query filter
      if (!searchQuery.trim()) return true
      const query = searchQuery.trim().toLowerCase()
      const terms = query.split(/\s+/).filter(Boolean)

      return terms.every((term) => {
        const regex = new RegExp(`\\b${term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`, "i")
        const matchTitle = regex.test(guide.title)
        const matchDesc = regex.test(guide.description)
        const matchKeywords = regex.test(guide.keywords)
        const matchSteps = guide.steps.some(
          (step) => regex.test(step.title) || regex.test(step.body),
        )
        const matchTip = guide.tip ? regex.test(guide.tip) : false

        return matchTitle || matchDesc || matchKeywords || matchSteps || matchTip
      })
    })
  }, [searchQuery, selectedCategory])

  return (
    <div className="text-slate-700 print:text-slate-900">
      <style>{PRINT_PAGE}</style>

      {/* Top Action Bar */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4 print:hidden">
        <div className="flex items-center gap-2">
          <BookOpen className="size-5 text-cyan-600" />
          <span className="text-sm font-bold text-slate-900 uppercase tracking-wider">Help Center & Guides</span>
        </div>
        <PrintGuideButton />
      </div>

      {/* Hero Header */}
      <header className="border-b border-slate-200 pb-6">
        <p className="text-xs font-semibold tracking-[0.18em] text-cyan-700 uppercase">Scopepipe User Guide</p>
        <h1 className="mt-2 text-3xl sm:text-4xl font-bold tracking-tight text-slate-950">Help Center</h1>
        <p className="mt-2 max-w-3xl text-sm sm:text-base leading-relaxed text-slate-600">
          Everything you need to set up your painting business, write mobile room estimates, markup job photos, dictate voice notes, print paint buy lists, and hand bilingual crew sheets to your painters.
        </p>

        {/* Search Bar */}
        <div className="relative mt-6 max-w-2xl print:hidden">
          <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search guides (e.g. estimating, sketch, voice, spanish, paddle, seats)..."
            data-testid="help-search-input"
            className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-10 pr-10 text-sm text-slate-900 placeholder-slate-400 shadow-xs focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
          />
          {searchQuery ? (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              title="Clear search"
            >
              <X className="size-3.5" />
            </button>
          ) : null}
        </div>

        {/* Category Filter Chips */}
        <div className="mt-4 flex gap-1.5 overflow-x-auto pb-2 scrollbar-none print:hidden">
          {CATEGORIES.map((cat) => {
            const isSelected = selectedCategory === cat
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                data-testid={`help-category-${cat.toLowerCase().replace(/\s+/g, "-")}`}
                className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                  isSelected
                    ? "bg-cyan-600 text-white shadow-xs"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900"
                }`}
              >
                {cat}
              </button>
            )
          })}
        </div>

        {/* Results Counter / Active Filter Bar */}
        {searchQuery || selectedCategory !== "All" ? (
          <div className="mt-3 flex items-center justify-between text-xs text-slate-500 print:hidden">
            <span>
              Showing {filteredGuides.length} of {GUIDES.length} guides
              {searchQuery ? ` matching "${searchQuery}"` : ""}
              {selectedCategory !== "All" ? ` in ${selectedCategory}` : ""}
            </span>
            <button
              type="button"
              onClick={() => {
                setSearchQuery("")
                setSelectedCategory("All")
              }}
              className="font-semibold text-cyan-600 hover:text-cyan-700 hover:underline"
            >
              Reset filters
            </button>
          </div>
        ) : null}
      </header>

      {/* Main Grid: Nav Sidebar & Content */}
      <div className="mt-8 grid gap-8 lg:grid-cols-[16rem_minmax(0,1fr)] lg:items-start lg:gap-12 print:block">
        {/* Table of Contents Nav */}
        <aside className="print:hidden">
          <details className="rounded-2xl border border-slate-200 bg-white p-3 lg:hidden">
            <summary className="cursor-pointer text-sm font-semibold text-slate-950">Table of Contents</summary>
            <ol className="mt-3 flex flex-col gap-1">
              {filteredGuides.map((guide) => (
                <li key={guide.id}>
                  <a
                    href={`#${guide.id}`}
                    className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs text-slate-600 hover:bg-slate-100 hover:text-slate-950"
                  >
                    <span className="font-semibold text-cyan-700">{guide.number}</span>
                    <span className="line-clamp-1">{guide.title}</span>
                  </a>
                </li>
              ))}
            </ol>
          </details>

          <nav aria-label="Help topics" className="sticky top-6 hidden lg:block">
            <p className="text-xs font-semibold tracking-[0.16em] text-slate-500 uppercase">Topics ({filteredGuides.length})</p>
            <ol className="mt-3 flex flex-col gap-1">
              {filteredGuides.map((guide) => (
                <li key={guide.id}>
                  <a
                    href={`#${guide.id}`}
                    className="flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-950 transition-colors"
                  >
                    <span className="font-semibold text-cyan-700">{guide.number}</span>
                    <span className="line-clamp-1">{guide.title}</span>
                  </a>
                </li>
              ))}
            </ol>
          </nav>
        </aside>

        {/* Guides Content List */}
        <article className="flex flex-col gap-8">
          {filteredGuides.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-white p-12 text-center">
              <HelpCircle className="size-8 text-slate-400" />
              <h3 className="mt-3 text-base font-semibold text-slate-900">No guides matched your search</h3>
              <p className="mt-1 text-sm text-slate-500">
                Try searching for different keywords like 'estimating', 'sketch', 'rates', 'spanish', or 'billing'.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("")
                  setSelectedCategory("All")
                }}
                className="mt-4 rounded-lg bg-cyan-600 px-4 py-2 text-xs font-semibold text-white hover:bg-cyan-500"
              >
                Clear Search
              </button>
            </div>
          ) : (
            filteredGuides.map((guide) => {
              const Icon = guide.icon
              return (
                <section
                  key={guide.id}
                  id={guide.id}
                  data-testid={`guide-section-${guide.id}`}
                  className="scroll-mt-20 rounded-2xl border border-slate-200 bg-white p-5 sm:p-8 shadow-xs"
                >
                  {/* Topic Header */}
                  <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 pb-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold tracking-wider text-cyan-700 uppercase">Guide {guide.number}</span>
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                          {guide.category}
                        </span>
                      </div>
                      <h2 className="mt-1 flex items-center gap-2 text-xl sm:text-2xl font-bold tracking-tight text-slate-950">
                        <Icon className="size-5 text-cyan-600" />
                        <span>{guide.title}</span>
                      </h2>
                      <p className="mt-1 text-sm text-slate-600">{guide.description}</p>
                    </div>

                    {guide.appLink ? (
                      <Link
                        href={guide.appLink.href}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-cyan-200 bg-cyan-50 px-3 py-1.5 text-xs font-semibold text-cyan-800 hover:bg-cyan-100 hover:border-cyan-300 transition-colors print:hidden"
                      >
                        <span>{guide.appLink.label}</span>
                        <ChevronRight className="size-3.5" />
                      </Link>
                    ) : null}
                  </div>

                  {/* Steps */}
                  <div className="mt-6 flex flex-col gap-4">
                    {guide.steps.map((step) => (
                      <div key={step.n} className="grid grid-cols-[2rem_minmax(0,1fr)] gap-3">
                        <span className="flex size-8 items-center justify-center rounded-full bg-cyan-400 text-sm font-bold text-slate-950">
                          {step.n}
                        </span>
                        <div>
                          <h3 className="font-semibold text-slate-950 text-sm sm:text-base">{step.title}</h3>
                          <p className="mt-1 text-xs sm:text-sm leading-relaxed text-slate-600">{step.body}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Pro Tip */}
                  {guide.tip ? (
                    <aside className="mt-6 rounded-xl border border-cyan-200 bg-cyan-50/70 p-4 text-xs sm:text-sm leading-relaxed text-slate-800">
                      <p className="text-[11px] font-bold tracking-wider text-cyan-800 uppercase">Pro Tip</p>
                      <p className="mt-1">{guide.tip}</p>
                    </aside>
                  ) : null}
                </section>
              )
            })
          )}
        </article>
      </div>
    </div>
  )
}

const PRINT_PAGE = `
@media print {
  @page { size: letter; margin: 0.6in; }
  body { background: #ffffff !important; }
}
`
