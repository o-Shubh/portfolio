# Eliphas Indicus Publications

Print-on-demand self-publishing for Indian authors. One Next.js app that works as
a website, a web app and (from milestone 7) an installable phone app.

**Stack:** Next.js 16 (App Router, TypeScript) · Tailwind CSS 4 · Supabase (Postgres,
phone OTP login, file storage) · Razorpay (test mode) · Vercel.

## Milestones

| # | What | Status |
|---|------|--------|
| 1 | Project setup, database, phone OTP login, role-based layouts | ✅ Done |
| 2 | Public website: home, pricing, FAQ, bookstore, book pages | ✅ Done |
| 3 | Author publishing flow + live earnings calculator | ✅ Done |
| 4 | Admin: review queue, printers, payouts, settings | ✅ Done |
| 5 | Razorpay checkout, orders, printer portal | ✅ Done |
| 6 | Author dashboard: earnings, sales by month and city | ✅ Done |
| 7 | Install prompt (PWA) and deploy to Vercel | |

## Live preview link (no computer needed)

`http://localhost:3000` only works on the computer running the app. To get a link that opens
on any phone, put the app online (free plans are enough):

**1. Database: Supabase** (supabase.com → New project, region **Mumbai**)
- SQL Editor → New query → paste all of [`supabase/hosted-setup.sql`](supabase/hosted-setup.sql) → **Run**.
- Optional, for a demo with sample books and orders: run [`supabase/seed.sql`](supabase/seed.sql) the same way.
  It also makes the test numbers 90000 00001 (admin), …02 (author) and …03 (printer). **Don't run it on the real launch database.**
- Authentication → Sign In / Providers → **Phone** → enable. Under **Test phone numbers** add
  `919000000001=123456, 919000000002=123456, 919000000003=123456, 919000000004=123456`.
  Test numbers never send an SMS. If it asks for SMS provider details before you have them, choose Twilio and
  enter placeholder values for now.
- To make **your own** number admin: SQL Editor →
  `insert into public.role_invites (phone, role) values ('91XXXXXXXXXX', 'admin');` (91 + your 10 digits).
- Project Settings → API Keys: copy the **Project URL**, **Publishable key** and **Secret key**.

**2. Website: Vercel** (vercel.com → sign in with GitHub → Add New → Project → import `portfolio`)
- **Root Directory:** `eliphas`
- **Environment Variables:** `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`,
  `SUPABASE_SECRET_KEY` (from step 1) and `NEXT_PUBLIC_SITE_URL` (your Vercel address, e.g. `https://eliphas.vercel.app`).
- Deploy. Every push to a branch then gets its own preview link automatically (shown on the Vercel dashboard).

**3. Back in Supabase:** Authentication → URL Configuration → set **Site URL** to your Vercel address.

When the database changes in a later milestone, run only the new file(s) from `supabase/migrations/`
in the SQL Editor (each milestone summary says which).

## Run it on your computer

You need **Node.js 20.9 or newer** and **Docker Desktop** (running). Docker runs a
private copy of Supabase on your machine, so you can test without touching the real one.

```sh
cd eliphas
npm install
npm run db:start          # first time downloads Supabase (a few minutes)
npx supabase status       # shows the keys you need in the next step
cp .env.example .env.local
```

Open `.env.local` and paste from `npx supabase status`:

- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` ← "Publishable" key (`sb_publishable_…`)
- `SUPABASE_SECRET_KEY` ← "Secret" key (`sb_secret_…`)

Then:

```sh
npm run dev
```

Open http://localhost:3000 and log in with a test number. **No SMS is sent; the code is always `123456`.**

| Mobile number | Becomes |
|---|---|
| 90000 00001 | Admin |
| 90000 00002 | Author |
| 90000 00003 | Printer (linked to "Sample Press Delhi") |
| 90000 00004 | Reader (any other new number is also a reader) |
| 90000 00005, 90000 00006 | Readers — spare numbers for testing (e.g. add one as a new printer) |
| 90000 00011 | Meera Iyer, a sample author with 6 months of sample sales (to see a full dashboard) |

### Useful commands

| Command | What it does |
|---|---|
| `npm run dev` | Start the app at http://localhost:3000 |
| `npm run db:start` / `npm run db:stop` | Start / stop local Supabase |
| `npm run db:reset` | Wipe the local database and rebuild it from `supabase/migrations` + `supabase/seed.sql` |
| `npm run db:types` | Regenerate `src/lib/database.types.ts` after changing the database |
| `npm run db:bundle` | Rebuild `supabase/hosted-setup.sql` (all migrations in one file for pasting into Supabase) |
| `npm test` | Check the pricing maths (print cost, fees, earnings) |
| `npm run typecheck` · `npm run lint` · `npm run build` | Checks to run before pushing |

## How it fits together

```
eliphas/
├── supabase/
│   ├── migrations/      database tables, security rules, default settings (runs in order)
│   ├── seed.sql         local test data only (never runs on the real database)
│   └── config.toml      local Supabase settings, including the test phone numbers
└── src/
    ├── proxy.ts         runs before every page: refreshes login, sends logged-out visitors to /login
    ├── lib/
    │   ├── auth.ts      getCurrentProfile(), requireRole([...]), where each role lands
    │   ├── pricing.ts   print cost and earnings maths (one place, used everywhere)
    │   ├── settings.ts  loads print rates and fees from the settings table
    │   ├── books.ts     bookstore queries (search, filters, book page)
    │   ├── publishing.ts book statuses, genres, file locations, "ready to submit" checklist
    │   ├── supabase/    client.ts (browser), server.ts (pages/actions), admin.ts (full access, server only)
    │   └── nav.ts       menu items for each area
    ├── components/      AppShell (sidebar + phone tab bar), BookCover, BookCard, Logo, ThemeToggle, forms
    ├── content/faq.ts   FAQ questions and answers (edit freely)
    └── app/
        ├── (site)/      public website: home, books/, books/[slug]/, pricing/, faq/
        ├── login/       phone number → 6-digit code
        ├── onboarding/  name, city, state, "I want to publish" (first login only)
        ├── dashboard/   sends you to your area based on your role
        ├── account/     everyone: orders, profile
        ├── author/      authors: dashboard, books/ list, books/new, books/[id]/{details,files,print,submit}
        ├── printer/     printers (and admin)
        └── admin/       admin: overview, review/ queue, books/[id] review page, printers/, payouts/, settings/
```

### Roles

- **Reader** – everyone starts here. Can buy books.
- **Author** – a reader can switch to author themselves ("I want to publish").
- **Printer** and **Admin** – only given by an admin. Add the phone number to the
  `role_invites` table (or, from milestone 4, the printer list); when that person
  logs in for the first time they get the role.

Security is enforced **inside the database** (Row Level Security), not only in the
app. For example, an author cannot make themselves admin or publish their own book
without review, even with direct API calls.

### How publishing works

1. **Details** – title, author name, language, genre, description, optional ISBN.
2. **Files** – manuscript PDF (up to 50 MB) and cover (JPG/PNG/WebP/PDF, up to 10 MB). Files go
   straight from the author's phone to Supabase Storage. The app reads the PDF's page count and
   page size, and warns if the size doesn't match the chosen book size.
3. **Print & price** – size, inside pages, paper, binding, finish and MRP, with a live
   earnings breakdown. The server recalculates the price on save; the browser's numbers are never trusted.
4. **Submit** – a checklist must be complete. Then the book is **In review** and locked:
   neither the details nor the files can change (enforced by the database and storage rules),
   so the admin approves exactly what will be printed. Authors can withdraw from review,
   unpublish a live book to edit it, or delete a draft (its files are deleted too).

Book statuses: Draft → In review → Live, or Changes needed (admin sends back with a note,
milestone 4) → author fixes → In review again.

### Admin

- **Review** – books waiting for review, oldest first. Open one to download the manuscript
  and print cover, see automatic checks (page size, cover size, earnings), then **Approve and
  publish** or **Send back** with a note the author sees. Live books can be unpublished with a reason.
- **Printers** – add a print shop with its mobile number. That number gets printer access the
  first time it logs in (or straight away if the person already has a reader account).
  Pause a printer to stop new orders going to them.
- **Payouts** – each author's earnings from paid orders, what's been paid, and the balance.
  Pay by UPI/bank outside the app, then **Record a payout** with the UTR number.
  Authors add their UPI ID on their profile.
- **Settings** – print rates, fees and shipping (see above).

### Author dashboard

`/author` shows, for the logged-in author only:
- **Copies sold, total earned, paid to you, due to you** (all time, with this month underneath)
- **Copies sold by month** (6 or 12 months; tap a bar for that month's earnings; "Show as table" for exact numbers)
- **Where your readers are**: copies by delivery city (top 7, the rest grouped)
- **Your books**: copies and earnings per book
- **Latest orders** and **Payouts**; `/author/orders` lists every order with its status

Only paid orders count. Authors never see buyers' names, phones or addresses: the numbers come
from database functions (`my_balance`, `my_sales_by_month`, `my_sales_by_city`, `my_sales_by_book`,
`my_book_orders`) that return the caller's own sales and only the city and status of each order.

### Orders and payments

1. **Buy now** on a book → `/checkout/<book>`: copies (1–10) and delivery address. The total is
   worked out again on the server from the database; the browser's numbers are never trusted.
2. The order is saved as *Awaiting payment* and Razorpay Checkout opens (UPI, cards, net banking, wallets).
3. On success the server checks Razorpay's signature, marks the order **Paid** and sends it to a
   printer: an active printer in the buyer's state if there is one, otherwise the least busy one.
   Razorpay's webhook (`/api/razorpay/webhook`) does the same in case the buyer closes the app mid-payment.
4. The printer sees it under **New**, downloads the PDFs, and moves it along:
   Accept → Printed → Shipped (courier + tracking number) → Delivered. The reader sees each step
   and the tracking number under **My orders**. Admin → **Orders** shows everything and can move
   an order to another printer.

The money split per copy (print cost, ₹15 fee, payment charges, author earning) is saved with each
order, so later rate changes never alter past orders or payouts.

**Razorpay setup** (test mode first): Dashboard → Account & Settings → API Keys → generate test keys.
Add `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` to `.env.local` (and Vercel). Then Dashboard →
Webhooks → add `https://<your-site>/api/razorpay/webhook`, event `payment.captured`, with a secret you
also set as `RAZORPAY_WEBHOOK_SECRET`. Test cards and UPI IDs: razorpay.com/docs/payments/payments/test-card-details.
Without keys, local development shows a built-in **test payment** window instead (it refuses to run on the live site).

### Sample books

Local development has 10 sample published books (5 Hindi, 5 English) and about 80 past
orders from 10 cities from `supabase/seed.sql`, so payouts and dashboards have numbers to show.
They have no cover image, so the site draws a simple typographic cover in brand colours.
Real covers uploaded by authors (milestone 3) replace these automatically.

### Print rates and fees (no code needed)

Stored in the `settings` table:

- `print_rates` – per-page and binding costs for each size, paper, binding, finish (**sample values for now**)
- `fees` – platform fee per copy (₹15) and Razorpay charges (2% + 18% GST)
- `shipping` – flat shipping and free-shipping threshold

To change them: log in as admin → **Settings**. Every number and label has a field; the
"Advanced" box lets you add or remove options (e.g. a new book size) as JSON. Every change is
checked before it is saved. The page also lists any live books whose authors would earn
nothing at the new rates. Past orders always keep the prices they were bought at.
(You can also edit the `settings` table directly in the Supabase dashboard.)

The print cover size shown to authors = 2 × book width + spine + bleed on each side, where
spine = pages × paper's `spine_mm_per_page` (sample values: ask your printer).

## Setting up the real (hosted) Supabase

Do this once, before deploying (milestone 7). You can do it now if you like.

1. Create a project at https://supabase.com (region: **Mumbai, ap-south-1**).
2. Link and push the database:
   ```sh
   npx supabase login
   npx supabase link --project-ref YOUR_PROJECT_REF
   npx supabase db push
   ```
3. **Phone login:** Dashboard → Authentication → Sign In / Providers → **Phone** → enable.
   Pick an SMS provider (Twilio, MessageBird, Textlocal or Vonage) and enter its keys.
   For Indian numbers you will need DLT registration with your SMS provider.
   While testing, add **test phone numbers** with fixed codes on the same screen (no SMS sent).
4. **Make yourself admin.** Dashboard → SQL Editor → run (use your number, 91 + 10 digits, no +):
   ```sql
   insert into public.role_invites (phone, role) values ('919876543210', 'admin');
   -- if you already logged in once:
   update public.profiles set role = 'admin' where phone = '919876543210';
   ```
5. Copy the project URL, publishable key and secret key (Project Settings → API Keys)
   into `.env.local` (and into Vercel in milestone 7).

## Notes

- Built for phones first; tablet and desktop get a sidebar. Light and dark mode follow
  the device, or tap the theme button (device → light → dark).
- Brand: ink `#17214A`, marigold `#C98200` (text on it `#2E1E00`), deodar `#2E6150`,
  paper `#F3F4F7`. Headings in Literata, body in Mukta (which also covers Hindi).
- Capacitor: the app avoids anything that would block wrapping it later. The wrapper
  will load the deployed site URL.
