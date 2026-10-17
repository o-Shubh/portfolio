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
| 8 | Author articles, follows, notifications, moderation | ✅ Done |

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
- Webhooks → **Add new webhook**: URL `https://<your-site>/api/razorpay/webhook`, events **payment.captured**,
  **payment.failed**, **refund.processed** and **refund.failed**, secret = your `RAZORPAY_WEBHOOK_SECRET`.
- Test cards and UPI: razorpay.com/docs/payments/payments/test-card-details. When you're ready for real money,
  complete Razorpay's KYC, generate **live** keys and replace the test ones in Vercel.

After changing environment variables in Vercel, click **Redeploy** so they take effect.
When a future change adds a database file in `supabase/migrations/`, run just that file in the SQL Editor.
For a project set up before 15 October 2026, run
[`supabase/migrations/20261015000008_launch.sql`](supabase/migrations/20261015000008_launch.sql) once.
For a project set up before the plans and services update, run these two files **as two separate runs, in
this order** (the first adds order steps the second uses; Postgres needs them committed first):
[`20261016000009_order_steps.sql`](supabase/migrations/20261016000009_order_steps.sql), then
[`20261016000010_monetisation.sql`](supabase/migrations/20261016000010_monetisation.sql).
Then, for the service portfolio update, run
[`20261017000011_service_portfolio.sql`](supabase/migrations/20261017000011_service_portfolio.sql) **before**
deploying that code (it adds new catalogue versions with the same prices and the bundle-upgrade columns).
Back up the database first (Supabase → Database → Backups). Existing authors keep their original
₹15-per-copy terms until they accept the new terms themselves; past orders are not changed.

### Launch checklist
Admin → **Overview** shows a live checklist of the items it can check (business details, rates, printers,
Razorpay keys, webhook, site address).
- [ ] Business details in Admin → Settings (name, address, email, phone): they fill the Contact, Terms,
      Privacy, Refunds and Shipping pages that Razorpay checks during KYC. Have the policies reviewed by
      someone who knows Indian e-commerce law.
- [ ] Real SMS provider with DLT approval; remove the test phone numbers
- [ ] Real print rates in Admin → Settings, and untick "These are sample rates"
- [ ] Ask the printer for paper thickness (spine) and update it in Settings
- [ ] Your printers added in Admin → Printers
- [ ] Razorpay live keys and webhook
- [ ] FAQ promises checked (review time, delivery time) in `src/content/faq.ts`
- [ ] Real shipping rates in Admin → Shipping (the seeded All-India zone is a sample), then untick "sample"
- [ ] Accountant has checked the tax settings in Admin → Plans (GST registration, GSTIN, rate) and TDS/TCS duties
- [ ] Author terms, Pro and service terms reviewed by a lawyer before the 1 Nov 2026 effective date
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

### Play Store (Android)

The quickest route needs no coding: **PWABuilder** turns the live website into a Play Store app
(a "Trusted Web Activity" that shows the site full-screen, always up to date).

1. Make sure the live site works and is installable (Chrome shows *Install app*).
2. Go to **pwabuilder.com**, enter your site address, click **Package for stores → Android**.
   Keep the suggested package name (e.g. `app.vercel.eliphas.twa`) and download the zip.
3. In **Play Console** (one-time $25 fee): create the app, upload the `.aab` file from the zip, and turn on
   Play App Signing. Copy the **SHA-256 certificate fingerprint** from *Test and release → App integrity*.
4. In Vercel, add `ANDROID_PACKAGE_NAME` (the package name) and `ANDROID_SHA256_CERT` (the fingerprint),
   then **Redeploy**. Check `https://<your-site>/.well-known/assetlinks.json` shows them. Without this, the
   app shows a browser address bar.
5. Fill in the store listing. For *Data safety* and *Account deletion*, use your Privacy policy page and
   `https://<your-site>/account/profile` (Profile → Delete account).

iPhone users install from Safari (Share → Add to Home Screen). An App Store app needs a Mac and a native
wrapper such as Capacitor (below); Apple often rejects apps that only show a website, so start with Android.

### Later: native wrappers with Capacitor

Capacitor loads the live website inside a native shell, for the App Store or for native features:

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
- **Plans** – Free / Pro / original-terms rates as versions with an effective date (a new version never
  changes past orders), the author terms version, and tax settings.
- **Services** – the versioned service catalogue and the fulfilment queue: requirements pending → scope
  review → quote → payment → queued → in progress → author review → revision → completed (or cancelled /
  refunded). Quotes that differ from the catalogue need a reason; final print files need the QC checklist.
- **Subscriptions** – Pro periods, credits (with manual adjustments) and audited refunds.
- **Shipping** – zones by PIN-code prefix, weight slabs, extra per 500 g, and shipping promotions
  (funded by the platform, never from author earnings).
- **Finance** – reader payments, platform commission and GST on it, actual gateway costs, shipping,
  Pro and service income, refunds and author liabilities. Total book sales are shown as sales value,
  never as platform profit.
- **Issues** – damaged / wrong / missing book reports with photos; resolve with a free replacement or refund.
- **Settings** – print rates, fees and business details.

Every money change made by an admin is written to `audit_log`.

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

### Author articles

Authors (Free and Pro) write articles at `/author/articles`: essays, reflections, writing advice and
authorised book excerpts. Articles are free to read at `/articles` and on each author's public page
(`/authors/{handle}?tab=articles`). They are separate from books and their updates.

- **Writing.** A small, safe text format (`## heading`, `**bold**`, `*italic*`, `> quote`, `- list`,
  `1. list`, `[link](https://…)`) with a toolbar and Preview. The server parses it into structured
  blocks (`articles.body`) that pages render as plain React elements: author HTML is never rendered
  and only http(s) links become links. Drafts autosave two seconds after typing stops; a copy is kept
  in the browser if saving fails and offered back after a reload. Publishing is always an explicit,
  confirmed step and needs a title, excerpt, topic, 30+ words, cover alt text (if there's a cover) and
  the rights confirmation. A published article changes only when the author presses Update.
- **Covers** go through `/api/articles/[id]/cover`: JPEG/PNG/WebP checked by their bytes, at most 5 MB,
  re-encoded to WebP (max 1600 px), which strips EXIF/GPS. Stored in the public `article-covers` bucket.
- **Links** are `/articles/{short_id}-{slug}`. The short id never changes, so links survive title
  changes (old slugs redirect). Only published, visible articles appear in the sitemap and metadata;
  editors and account pages are `noindex`.
- **Readers** can read without logging in. Like (once per account), private Save ("Saved articles"),
  comment (flat; edit/delete your own), share, report, follow and block need OTP login, and the reader
  comes back to the same action afterwards (`?intent=`).
- **Notifications.** Followers get one in-app notification when an article is first published (never on
  edits or republishing; the database refuses duplicates), unless they turned it off in
  `/account/notifications`. No SMS.
- **Analytics.** Every author sees views, likes and comments. Pro authors also see views per day and
  related-book clicks. A view counts once per signed-in reader, or per browser, per article per day
  (the author's own visits don't count); they aren't unique people. Book clicks show interest, not sales.
  Authors never see who liked, saved or viewed.
- **Moderation.** Articles go live without pre-review. Readers report articles or comments; admins review
  them at `/admin/moderation` (hide, restore, remove, dismiss, each with a logged reason) and can restrict
  accounts from posting. Comments and reports are rate limited. No automated plagiarism or AI checks.

### Profile photos and free samples

- **Photos.** Anyone can add a profile photo in Account → Profile. It's checked by its bytes (JPEG, PNG or
  WebP, up to 5 MB), cropped square to 400 × 400 and re-encoded as WebP, which removes EXIF/GPS. Photos show on
  articles, author pages, comments and the app header; without one, initials are shown.
- **Free sample ("Read sample").** On a book's **Free sample** step, the author picks a page range from their
  own manuscript: at most 10% of the book and never more than 30 pages. The server copies only those pages into
  a new PDF (manuscript metadata is not copied) in the public `book-samples` bucket; the manuscript stays
  private. The sample appears on the book page and on articles that link to the book, once the book is
  published. Authors can update or stop sharing it at any time.

### Design system

Tokens live in `src/app/globals.css`. The look is neutral and quiet: white and soft-grey surfaces
(`#FFFFFF` / `#F5F5F7`; black and `#1C1C1E` in dark mode), hairline borders, gentle shadows,
restrained corners (10 px controls, 14 px cards) and one accent, Eliphas navy `#17214A` (lifted to
`#4A63C9` on dark backgrounds). Every text colour pair meets WCAG AA. Interface text uses the device's
own sans-serif (San Francisco, Roboto, Segoe UI) with Noto Sans Devanagari for Hindi. Source Serif 4
(and Noto Serif Devanagari) is kept for books and editorial reading: book and article titles, article
text and typographic covers. The header is white with a light blur; there are no other glass effects.

Shared building blocks (utility classes): `btn-primary` (one per task area), `btn-ghost` (secondary),
`btn-accent` (buying), `btn-quiet`, `btn-danger`, `field` (shows `aria-invalid`), `label`, `hint`, `card`,
`chip` (filters and tabs, 44 px on touch), `badge`, `notice`, `eyebrow`; components `PageHeader`,
`EmptyState`, the status badges and `NavLinks` (phone tabs with a **More** sheet when a role has more than
five sections).

Behaviour: `useFormAction` keeps typed input on errors, ignores double submits, turns a dropped connection
into a clear "try again" message and can warn about unsaved changes (`warnUnsaved`); `offlineSafe()` does the
same for direct action calls; file uploads show a percentage (`src/lib/upload.ts`). There's a visible focus
ring for keyboard users, a "Skip to content" link, and animations are switched off for people who ask for
reduced motion.

### Orders and payments

1. **Buy now** on a book → `/checkout/<book>`: copies (1–10) and delivery address. Or **Add to cart** on
   several books → `/cart` (change copies, remove) → `/checkout`: one order, one payment, one parcel
   from one printer, shipping priced on the combined weight. The cart lives in a cookie (works before
   login, up to 10 books × 10 copies); books just paid for are removed from it, and a book that can't be
   sold any more stays in the cart marked unavailable and is left out of checkout. The total is
   worked out again on the server from the database; the browser's numbers are never trusted.
2. The order is saved as *Awaiting payment* and Razorpay Checkout opens (UPI, cards, net banking, wallets).
3. On success the server checks Razorpay's signature, marks the order **Paid** and sends it to a
   printer: an active printer in the buyer's state if there is one, otherwise the least busy one.
   Razorpay's webhook (`/api/razorpay/webhook`) does the same in case the buyer closes the app mid-payment.
4. The printer sees it under **New**, downloads the PDFs, and moves it along:
   Accept → Printed → Shipped (courier + tracking number) → Delivered. The reader sees each step
   and the tracking number under **My orders**. Admin → **Orders** shows everything and can move
   an order to another printer.

**Author earning per copy** = price − print cost − commission − GST on commission − share of the actual
Razorpay fee (taken from the payment; estimated only until Razorpay reports it). All in paise. Commission:
Free 15% (minimum ₹35), Pro 10% (minimum ₹25), original terms ₹15; each line stores the rule it used
(`commission_rule`), so later rate changes never alter past orders or payouts. Example, ₹299 book with ₹120
print cost: Free ₹119.02, Pro ₹136.66 to the author. Shipping is weight and PIN-code based, paid by the
reader, and never taken from author earnings.

Order steps: Paid → Accepted → Printing → Packed → Shipped → Delivered; every change is kept in
`order_status_history`.

**Pro and services.** Pro is ₹299 + 18% GST = ₹352.82 for one month, prepaid; it doesn't renew
automatically (buying again extends it). Each paid month grants 3 template creatives (1 revision each), no
rollover. Paid services (cover, formatting, launch kit, bundle) are separate from Pro credits and use a fixed
quote the author accepts before paying. On a book's **Files** and **Submit** steps, authors can tick services
as add-ons for that book ("Need help with this book?"): the requests are created in one go, pre-filled from the
book (title, trim, pages, paper, blurb), formatting and the bundle use the book's uploaded manuscript, and the
bundle can't be combined with the services it already includes.

**Service portfolio.** Each service card (pricing page, Author → Services, a book's add-ons) shows the price with
GST, sample work in a gallery (zoom, previous/next, keyboard), deliverables, revisions, exclusions and "Delivery
timeline is confirmed after reviewing your requirements." Samples live in `public/samples/` (WebP previews and
the formatting before/after PDFs) and are described in `src/lib/service-portfolio.ts`; they are a fictional,
AI-assisted book and author, labelled as such, and never added to the bookstore. **Bundle upgrades:** if an author
already requested a cover, formatting or launch kit for a book, they can request a bundle upgrade instead of a new
bundle. Admin sees what was paid and done, enters a credit per earlier request (capped at what was paid, none by
default) and sends an itemised quote. While an upgrade is open the earlier requests can't be quoted or paid on
their own; when the bundle is paid, unpaid earlier requests close automatically. All payments go through `payments` with a receipt number; the
webhook and the in-app confirmation both call the same idempotent database functions, so a payment is never
applied twice.

**Cancellations and refunds.** A buyer can cancel from the order page until the printer accepts it.
An admin can cancel any order that hasn't shipped (Admin → Orders → Cancel order, with a reason the buyer
sees). Paid orders are refunded in full through Razorpay's refund API straight away; the order page shows
the refund status, and a failed refund can be retried. Cancelled orders don't count towards author
earnings. A payment that arrives after an order was cancelled is refunded automatically.

**Account deletion** (needed for Play Store). Profile → Delete account. Readers can delete themselves once
no order is on its way; their login and profile are removed and past orders are kept, unlinked, for tax
records. Authors with books, printers and admins are asked to contact support.

**Razorpay setup** (test mode first): Dashboard → Account & Settings → API Keys → generate test keys.
Add `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` to `.env.local` (and Vercel). Then Dashboard →
Webhooks → add `https://<your-site>/api/razorpay/webhook`, events `payment.captured`, `payment.failed`,
`refund.processed` and `refund.failed`, with a secret you
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
- `fees` – Razorpay charge estimate (2% + 18% GST), used only until the actual fee is known
- `tax`, `commission_terms`, `parcel` – GST settings, author terms version, parcel weight assumptions
- Commission rates live in `plan_versions`, shipping in `shipping_zones` / `shipping_rates`

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
- Brand: from the Eliphas Indicus logo. Navy `#13223C` for the header, footer and main buttons, gold
  `#CB9436` for buy buttons and highlights (navy text on gold). One font, Poppins (Noto Sans Devanagari
  fills in for Hindi). Marketplace layout: navy header with search, category tiles, product cards, and a
  bottom tab bar on phones. Logo files are in `public/brand/` (`logo-full`, `logo-mark`, and `-light`
  versions for dark backgrounds); colours and building blocks (`btn-primary`, `btn-accent`, `card`,
  `field`…) live in `src/app/globals.css`.
- Login works with mobile numbers from many countries (country picker, default India).
  Payments are still in rupees and delivery is within India for now.
- Capacitor: see "Later: Play Store / App Store with Capacitor" above.
