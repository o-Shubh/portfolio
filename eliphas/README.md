# Eliphas Indicus Publications

Print-on-demand self-publishing for Indian authors. One Next.js app that works as
a website, a web app and an installable phone app (Android and iPhone).

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
| 7 | Install prompt (PWA) and deploy to Vercel | ✅ Done (deploy steps below) |

## Deploy to Vercel (step by step, about 20 minutes)

`http://localhost:3000` only works on the computer running the app. These steps put it online
with a real link. You only need a browser. Free plans are enough to start.

**1. Database: Supabase** (supabase.com → New project, region **Mumbai (ap-south-1)**)
1. SQL Editor → New query → paste all of [`supabase/hosted-setup.sql`](supabase/hosted-setup.sql) → **Run**.
2. *Demo only:* run [`supabase/seed.sql`](supabase/seed.sql) the same way for sample books, orders and test logins.
   **Skip this for the real launch database.**
3. Authentication → Sign In / Providers → **Phone** → enable.
   - For testing, add **Test phone numbers**: `919000000001=123456, 919000000002=123456, 919000000003=123456, 919000000004=123456`
     (no SMS is sent). If it asks for SMS provider details first, choose Twilio with placeholder values for now.
   - For launch, pick a real SMS provider (Twilio, MessageBird, Textlocal or Vonage). Indian numbers need
     **DLT registration** with that provider, which can take a few days, so start early.
4. Make **your own** number admin: SQL Editor →
   `insert into public.role_invites (phone, role) values ('91XXXXXXXXXX', 'admin');` (91 + your 10 digits),
   then log in with that number.
5. Project Settings → API Keys: copy the **Project URL**, **Publishable key** and **Secret key**.

**2. Website: Vercel** (vercel.com → Sign up with GitHub → **Add New → Project** → import `portfolio`)
1. **Root Directory:** `eliphas` (click Edit next to it). Framework is detected as Next.js.
2. **Environment Variables** (paste each name and value):

   | Name | Value |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | Project URL from Supabase |
   | `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Publishable key |
   | `SUPABASE_SECRET_KEY` | Secret key (keep private) |
   | `NEXT_PUBLIC_SITE_URL` | Your Vercel address, e.g. `https://eliphas.vercel.app` |
   | `RAZORPAY_KEY_ID` | Razorpay test Key ID (`rzp_test_…`) |
   | `RAZORPAY_KEY_SECRET` | Razorpay test Key Secret |
   | `RAZORPAY_WEBHOOK_SECRET` | Any long random text; use the same in step 4 |

3. **Deploy.** The app code lives on the branch `claude/eliphas-indicus-platform-yee31f`. Either merge it into
   `main` (via a pull request), or in Vercel → Settings → Git set **Production Branch** to that branch.
   Every other push gets its own preview link automatically.

**3. Supabase again:** Authentication → URL Configuration → **Site URL** = your Vercel address.

**4. Razorpay** (dashboard.razorpay.com, **Test mode** switch on)
- Account & Settings → API Keys → **Generate test key** → put them in Vercel (step 2).
- Webhooks → **Add new webhook**: URL `https://<your-site>/api/razorpay/webhook`, event **payment.captured**,
  secret = your `RAZORPAY_WEBHOOK_SECRET`.
- Test cards and UPI: razorpay.com/docs/payments/payments/test-card-details. When you're ready for real money,
  complete Razorpay's KYC, generate **live** keys and replace the test ones in Vercel.

After changing environment variables in Vercel, click **Redeploy** so they take effect.
When a future change adds a database file in `supabase/migrations/`, run just that file in the SQL Editor.

### Launch checklist
- [ ] Real SMS provider with DLT approval; remove the test phone numbers
- [ ] Real print rates in Admin → Settings, and untick "These are sample rates"
- [ ] Ask the printer for paper thickness (spine) and update it in Settings
- [ ] Your printers added in Admin → Printers
- [ ] Razorpay live keys and webhook
- [ ] FAQ promises checked (review time, delivery time) in `src/content/faq.ts`
- [ ] Custom domain in Vercel (Settings → Domains), then update `NEXT_PUBLIC_SITE_URL` and Supabase Site URL

## Install as an app (Android and iPhone)

The site is a **Progressive Web App**: no app store needed.
- **Android (Chrome):** an "Get the Eliphas app" card offers an **Install app** button. Chrome's menu
  → *Install app* also works.
- **iPhone (Safari):** the card shows two steps: **Share** → **Add to Home Screen**.
- The card hides once the app is installed, and for 14 days after "Not now".
- Installed, it opens full-screen with the Eliphas icon, has shortcuts (Bookstore, My account,
  Publish a book; long-press the icon on Android), and shows a friendly page when there's no internet.
- The service worker (`public/sw.js`) only caches static files (code, icons, fonts). Pages, account data and
  payments always come fresh from the network, so nothing private is stored on the phone.

Files: `src/app/manifest.ts`, `public/sw.js`, `public/offline.html`, `public/icons/`,
`src/components/InstallPrompt.tsx`, `src/components/ServiceWorker.tsx`.

### Later: Play Store / App Store with Capacitor

The app is ready to be wrapped: it already uses safe-area spacing for notches, a phone-style tab bar,
and no browser-only tricks. Capacitor loads the live website inside a native shell:

```sh
cd eliphas
npm install @capacitor/core @capacitor/cli @capacitor/android @capacitor/ios
npx cap init "Eliphas Indicus" in.eliphas.app --web-dir public
```
Then in `capacitor.config.ts` set `server: { url: "https://<your-site>", cleartext: false }`, run
`npx cap add android` (and `npx cap add ios` on a Mac), and open the project in Android Studio / Xcode.
Use Razorpay's Capacitor plugin for payments inside the native app, and keep the web checkout for the website.

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

## Notes

- Built for phones first; tablet and desktop get a sidebar. Light and dark mode follow
  the device, or tap the theme button (device → light → dark).
- Brand: white / near-black `#0A0A0A` base with one accent, signal orange `#FF5A1F`
  (black text on it; `#C2410C` when the accent is used as text on white). Headlines in
  Newsreader (serif), everything else in Geist; Noto Sans Devanagari covers Hindi text.
  Colours and building blocks (`btn-primary`, `card`, `field`…) live in `src/app/globals.css`.
- Login works with mobile numbers from many countries (country picker, default India).
  Payments are still in rupees and delivery is within India for now.
- Capacitor: see "Later: Play Store / App Store with Capacitor" above.
