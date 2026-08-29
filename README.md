# Aali Quotation Desk

One-page quotations for **AALI CONSSULTANCY**, a subsidiary of Aali Group.

Type the client, the lines and the rates; the app computes GST, discount, round-off
and the amount in words, keeps the whole thing on a single A4 page, and prints it.
Every quotation is numbered by the database and kept in a register that a super
admin can read in full.

- React 19 + Vite + Tailwind 4
- Supabase for auth, data and row-level security
- Deployed on Vercel

---

## What it does

**One page, enforced.** A fit meter above the sheet reads `Fits one page — 74% used`
and turns red the moment the content would overrun. A density control (Roomy →
Tight) buys a few extra lines without editing content. The sheet is a real 210×297mm
box, so what is measured on screen is what prints.

**Numbers issued by the database.** Format `AC/2026-27/007` — prefix, Indian
financial year, running sequence. The next number is derived from the highest one
already stored for that year, inside an advisory lock, so two people saving at the
same instant get 007 and 008 rather than 007 twice. A deleted quotation's number is
never re-used, and backfilling an older row shifts the sequence forward on its own.

**Indian tax handling.** CGST+SGST within state, IGST across states, zero-rated
export under LUT, or none. Optional TDS 194J @ 2% note showing the net the client
will actually remit. Amounts in words use lakh/crore for INR and million for USD.

**A register.** Every quotation, searchable by number, client or subject, filterable
by status and financial year, with value quoted and value accepted. Staff see their
own; a super admin can switch the scope to everyone.

**One letterhead.** Business name, the Aali Group subsidiary line, GSTIN, PAN, logo,
default terms and payment details live in one shared row. Change it once and every
future quotation follows. Only a super admin can edit it.

---

## Setup

### 1. Install

```bash
npm install
```

### 2. Create the database

In the Supabase project → SQL Editor → paste and run
[`supabase/schema.sql`](supabase/schema.sql). It is safe to re-run.

That creates `profiles`, `business_settings`, `quotations`, the numbering
functions, the register view and all row-level-security policies.

### 3. Point the app at the project

```bash
cp .env.example .env
```

Fill in from Supabase → Project Settings → API:

```
VITE_SUPABASE_URL=https://<project>.supabase.co
VITE_SUPABASE_ANON_KEY=<publishable anon key>
```

The anon key is meant to be public — RLS is what protects the data. The **service
role** key is different: it bypasses RLS entirely and must never reach the browser
or a commit. It only ever goes in `.env.seed`, which is gitignored.

### 4. Create the logins

```bash
cp .env.seed.example .env.seed        # add SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY
cp scripts/users.example.json scripts/users.json
```

Edit `scripts/users.json` — one entry per person:

```json
[
  { "email": "you@aali.co", "full_name": "Your Name", "role": "super_admin" },
  { "email": "colleague@aali.co", "full_name": "Colleague", "role": "staff" }
]
```

Then:

```bash
npm run create-users
```

Passwords are generated and printed **once**. Copy them, hand them over privately,
and have each person change theirs. Omit `password` to have one generated, or set
it explicitly. Re-running is safe: existing accounts are not recreated, their role
is reconciled.

Roles:

| Role | Can do |
| --- | --- |
| `staff` | Create, edit, print and delete their own quotations. Read the letterhead. |
| `super_admin` | All of that, plus read and edit **everyone's** quotations, edit the letterhead, and change roles. |

### 5. Run it

```bash
npm run dev
```

`http://localhost:5173/preview` renders the printed template against sample data —
no login, no database. Dev server only; it is not in the production build.

---

## Deploying to Vercel

The repo is deploy-ready: `vercel.json` already rewrites all routes to
`index.html`, which a single-page app on client-side routing needs.

```bash
npx vercel login
npx vercel link
```

Add the two variables to **all three** environments (Production, Preview,
Development):

```bash
npx vercel env add VITE_SUPABASE_URL
npx vercel env add VITE_SUPABASE_ANON_KEY
```

Then ship it:

```bash
npx vercel --prod
```

Vite only exposes variables prefixed `VITE_`, and it reads them **at build time** —
after changing one in the Vercel dashboard you must redeploy for it to take effect.

Finally, in Supabase → Authentication → URL Configuration, set the Site URL to the
Vercel domain so auth redirects resolve.

---

## The logo

`public/logo.svg` is a placeholder in the brand gold. To use the real Aali mark,
either drop the artwork in as `public/logo.svg`, or sign in as a super admin and
upload it under **Business → Logo on the quotation** — that copy is stored in the
database and is what appears on the printed sheet.

---

## Project layout

```
src/
  lib/
    supabase.js       client; `isConfigured` drives the setup screen
    AuthProvider.jsx  session + profile + shared letterhead
    format.js         money, dates, amount-in-words (lakh/crore)
    totals.js         the ONE place quotation arithmetic happens
    defaults.js       default terms, payment block, quick-add presets
  components/
    QuotationSheet.jsx  the printed A4 document
    PaperStage.jsx      scales the sheet, measures the one-page fit
    Layout.jsx          header and navigation
    RequireAuth.jsx     login gate, with an optional super-admin check
  pages/
    Login.jsx  Quotations.jsx  Editor.jsx  Business.jsx  Admin.jsx
    SheetPreview.jsx    dev-only template preview
supabase/schema.sql   tables, numbering functions, RLS policies
scripts/create-users.mjs
```

## Notes

- Line items are stored as `jsonb`. A quotation is a frozen document; its lines are
  never queried across quotations, so a child table would only add joins.
- Totals are **stored**, not recomputed on read. The register shows the figure that
  was actually printed, even if tax rules change later.
- Deleting a quotation frees nothing: the number stays consumed. That is deliberate
  — a quotation register with reused numbers is worse than one with gaps.
