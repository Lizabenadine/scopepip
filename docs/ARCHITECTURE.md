# ScopePipe architecture

ScopePipe is a mobile-first estimating and pipeline tool for painting contractors. The product is **ScopePipe Field at $49/month**: unlimited estimates, a four-stage board, and a client book. This repo is the field app plus the production schema. Billing is not wired. Jobs persist in the browser and match the Supabase tables so a hosted project can take over without a redesign.

The pricing function in `lib/estimate/calculate.ts` is the only place money is computed. Screens render that result. A save materializes the same numbers into `line_items`.

## 1. File structure

Next.js App Router, TypeScript, Tailwind CSS v4, shadcn/ui (Base UI), Lucide icons. No `src/` directory. `@/*` maps to the repo root.

```
app/
  layout.tsx                 # fonts, ScopeProvider, AppShell
  page.tsx                   # pipeline (home)
  loading.tsx
  error.tsx
  not-found.tsx
  globals.css                # warm field palette, price + display tokens
  estimate/
    new/page.tsx
    [id]/page.tsx
  clients/
    page.tsx
    [id]/page.tsx
  settings/page.tsx          # rate card + $49 plan
components/
  ui/                        # shadcn primitives (Button, Input, Dialog, Sheet, …)
  shell/app-shell.tsx        # mobile bottom nav, desktop sidebar
  pipeline/
    pipeline-view.tsx        # stage chips (phone) and columns (desktop)
    estimate-card.tsx
    schedule-dialog.tsx
  estimator/
    estimator.tsx            # draft, save, stage moves
    estimate-screen.tsx
    client-field.tsx         # pick a client or type a new one
    scope-fields.tsx         # sq ft, walls, trim, coats
    margin-controls.tsx      # material margin vs labor margin
    line-item-list.tsx       # walls, trim, and extras
    add-line-dialog.tsx
    breakdown.tsx            # gallons, hours, cost, price
    price-summary.tsx        # sticky total (dock on phone, card on desktop)
  clients/
    client-book.tsx
    client-detail.tsx
    client-screen.tsx
  settings/rate-settings.tsx
lib/
  types.ts                   # domain types aligned with the SQL tables
  defaults.ts                # starter production rates and the $49 plan
  format.ts
  stages.ts                  # stage order, labels, empty copy
  estimate/
    calculate.ts             # the pricer
    calculate.test.ts
    materialize.ts           # quote → line_items rows
  data/
    seed.ts                  # sample book, same shape as the database
    store.tsx                # local repository (localStorage)
supabase/migrations/
  001_scopepipe.sql
```

Routes:

| Path | Screen |
| --- | --- |
| `/` | Pipeline |
| `/estimates/new` | Blank estimator, stamped with the current rate card |
| `/estimates/[id]` | Saved estimate |
| `/work-orders/[id]` | Crew sheet for a scheduled or completed job |
| `/p/[token]` | Public client proposal and signature |
| `/estimates/[id]/pay` | Deposit checkout |
| `/clients` | Client book |
| `/clients/[id]` | Contact + that client's jobs |
| `/settings` | Rate card and plan |

## 2. Supabase schema

Migration: `supabase/migrations/001_scopepipe.sql`.

Every tenant table carries `user_id` and a row-level security policy of `user_id = auth.uid()`. A signup trigger seeds four pipeline stages and a rate card. Clients cannot be deleted while estimates still point at them. Deleting an estimate cascades its line items.

```
auth.users
    │
    ├── rate_cards            (1:1 defaults for the next estimate)
    ├── pipeline_stages       (4 rows per user, unique on slug)
    ├── clients
    └── estimates ─────────── line_items
              │
              ├── client_id
              └── stage_id
```

### pipeline_stages

| Column | Notes |
| --- | --- |
| `id` | uuid |
| `user_id` | owner |
| `slug` | `lead`, `estimate_sent`, `scheduled`, `completed` |
| `name` | Lead, Estimate Sent, Scheduled, Completed |
| `sort_order` | 0–3, this is the board order |

Slugs are constrained. Display names can change later without breaking the app.

### clients

`name`, `phone`, `email`, `address`, `notes`, timestamps. Name cannot be blank.

### estimates

Production inputs and a **copy of the rate card** live on the row. Changing company defaults does not rewrite a price already given to a customer.

| Inputs | Snapshot rates | Computed (written by the app) |
| --- | --- | --- |
| `square_feet` | `wall_sqft_per_hour` | `gallons` |
| `wall_count` | `minutes_per_wall` | `labor_hours` |
| `trim_linear_feet` | `trim_lf_per_hour` | `material_cost`, `labor_cost` |
| `coat_count` (1–6) | `wall_sqft_per_gallon`, `trim_lf_per_gallon` | `material_price`, `labor_price` |
| `scheduled_on` | `material_cost_per_gallon`, `labor_cost_per_hour` | `total_price` |
| `title`, `job_address`, `notes` | `material_margin`, `labor_margin` (0–0.90) | |

### line_items

One row per money bucket. Walls and trim are split into material and labor so a report can `sum(price) where kind = 'material'` without reimplementing the formula.

| Column | Notes |
| --- | --- |
| `source` | `walls`, `trim`, `custom` |
| `kind` | `material` or `labor` |
| `description`, `quantity`, `unit`, `coats` | |
| `unit_cost`, `margin` | margin used for that row |
| `cost`, `price` | snapshots |

`lib/estimate/materialize.ts` builds these rows from a quote. On save, replace every line for that estimate in the same write as the estimate snapshots.

`estimate_board` is a security-invoker view (estimate + client name + stage) for the pipeline query.

### App types vs columns

The running app uses camelCase (`squareFeet`, `stageId`, `customLines`). The local store does not persist derived wall/trim rows; it persists inputs and custom lines, then prices on read. The Supabase adapter's job is to fill `user_id` from `auth.uid()` and write both the estimate snapshots and `materializeLineItems()`.

## 3. Component layout

Phone first. Thumb reach and outdoor contrast matter more than density. Desktop keeps the same screens: a sidebar from `md`, and a two-column estimator from `lg`.

### Shell

```
phone                         desktop
┌─────────────────────┐       ┌────────┬──────────────────────┐
│ ScopePipe    $49/mo │       │ logo   │                      │
│                     │       │ + New  │   page               │
│   page              │       │ Jobs   │                      │
│                     │       │ Clients│                      │
│ Jobs Estimate       │       │ Rates  │                      │
│ Clients Rates       │       │ $49/mo │                      │
└─────────────────────┘       └────────┴──────────────────────┘
```

### Pipeline

Phone: a horizontal stage scroller (`All`, `Lead`, `Estimate Sent`, `Scheduled`, `Completed`) and a single column of cards, still grouped when All is selected.

Wide: four columns, search filters inside them. No drag-and-drop. Each card has one forward action named for the next stage: **Mark sent**, **Schedule**, **Complete**. Schedule asks for the on-site day.

```
┌──────────────────────────────┐
│ Maya Chen            $3,712  │
│ Main floor repaint           │
│ 1842 Birch St                │
│ 1,240 sf · 9 walls · 2 coats │
│ [Mark sent]          [Open]  │
└──────────────────────────────┘
```

### Estimator

Built for someone standing in a room, one hand on the phone.

```
phone                              desktop (lg)
┌──────────────────────────┐       ┌────────────────────┬─────────────┐
│ Client                   │       │ client, job, scope │  $3,712     │
│ Job          Address     │       │ margins, lines     │  29.5 hr    │
│ ┌────────┐ ┌────────┐    │       │ notes              │  8.1 gal    │
│ │ sq ft  │ │ walls  │    │       │                    │ [Mark sent] │
│ └────────┘ └────────┘    │       │                    │ [Save]      │
│ ┌────────┐ ┌────────┐    │       │                    │ breakdown   │
│ │ trim   │ │ 1 2 3 4│    │       └────────────────────┴─────────────┘
│ └────────┘ └────────┘    │
│ Material 30%  Labor 45%  │
│ Walls / Trim / Added     │
├──────────────────────────┤
│ $3,712   29.5 hr · 8.1 gal │  ← fixed above the tab bar
│ [Mark sent]      [Save]  │
└──────────────────────────┘
```

Scope controls are steppers (50 sq ft, 1 wall, 10 linear feet) plus a direct number field. Coat count is a 1–4 radio group, default 2. Three presets (Bedroom, Main floor, Whole house) fill a believable starting scope.

**Material margin and labor margin are separate sliders.** Moving material does not change labor price. The helper text states the definition used everywhere: price = cost ÷ (1 − margin).

Custom lines (doors, ceilings, primer) are material or labor and inherit that job's matching margin.

The phone total is a fixed dock. "How it prices" opens a bottom sheet with gallons, hours, cost, and price. From `lg` up, that breakdown sits in the sticky card.

Save is disabled until there is a client name and a non-zero price. A new name creates a client on save. The first save lands in Lead.

## Pricing model

Defaults (editable per company, snapshotted per estimate):

| Rate | Default |
| --- | --- |
| Wall rolling | 180 sq ft / hour / coat |
| Cut-in | 8 minutes / wall / coat |
| Trim brushing | 28 linear ft / hour / coat |
| Wall coverage | 350 sq ft / gallon / coat |
| Trim coverage | 350 linear ft / gallon / coat |
| Paint cost | $52 / gallon |
| Labor cost | $58 / hour burdened |
| Material margin | 30% |
| Labor margin | 45% |

```
wall gallons = square feet × coats / wall coverage
trim gallons = trim feet × coats / trim coverage
roll hours   = square feet × coats / wall production
cut hours    = wall count × coats × minutes per wall / 60
trim hours   = trim feet × coats / trim production

material price = material cost / (1 − material margin)
labor price    = labor cost    / (1 − labor margin)
total          = material price + labor price
```

Wall count changes labor only. It does not invent square footage. Zero or negative inputs, and a zero production rate, contribute nothing instead of dividing by zero. Margin is capped at 90%.

A one-coat, 350 sq ft, one-wall room at the defaults is **$293.40**: $52 of paint priced at $74.29, and 2.08 hours of labor priced at $219.11. Tests in `lib/estimate/calculate.test.ts` lock this.

## Data flow

```
rate card ──stamp──▶ estimate draft ──calculateEstimate()──▶ quote
                         │                                      │
                         │ save                                 │ materializeLineItems()
                         ▼                                      ▼
                    localStorage                         line_items (Supabase)
                    clients, estimates,
                    custom lines, stages
```

`ScopeProvider` loads `scopepipe.v1` from `localStorage` after mount (so server HTML does not diverge) and writes on every change. A corrupt payload falls back to the sample book and shows a notice. Unsaved estimator keystrokes also sit in `sessionStorage` so leaving the screen does not drop a half-priced room.

The sample book is six Portland-area jobs spread across Lead, Estimate Sent, Scheduled, and Completed, including one custom material line on the dental waiting room.

## What is intentionally not here

- No Supabase client and no env keys. The migration is ready; the UI runs without them.
- No card checkout. The $49 plan is shown as the product, not a charge.
- No accounts, drag-and-drop board, or photo takeoff. The forward action on a card is the whole pipeline interaction.
