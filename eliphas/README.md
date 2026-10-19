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
| 9 | Author verification, community for everyone, samples on every book, open reviews | ✅ Done (migration 000015) |
| 10 | Eliphas Edition IDs (EEID) and QR codes | ✅ Done (migration 000017) |
| 11 | Redesign to the shared "Cupertino Editorial" system; admin Finance fix | ✅ Done (migration 000018) |
| 12 | Distribution requests (Amazon India, Flipkart, international): intake and review only | ✅ Done (migration 000019) |

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
   | `PUBLIC_SITE_ORIGIN` | Your **production** domain for Edition ID QR codes, e.g. `https://your-domain.in` (Production environment only; leave unset on previews) |
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

- **Reader** – the default at sign-up. Can buy books, post in Community, follow, comment, save and review.
- **Author** – chosen at sign-up ("I'm joining as an author") or later from Account → Author verification.
  It's the same account, so authors keep everything readers can do. Publishing books is self-service;
  **Verified author** (below) is a separate, admin-given badge.
- **Two logins, one account.** `/login` is the **reader login** (buying, reading, community) and `/login/author`
  is the **author login** (publishing dashboard), with a Reader/Author switch on both. Both use the same
  mobile-number account, so nobody needs two accounts. A new number on the author login is set up as an author;
  an existing reader who uses it is offered "Start publishing" on the same account (orders and saved items stay).
  Logged-out visitors to `/author/…` are sent to the author login, everything else to the reader login. Admins
  and printers can use either; their roles never change.
- **Sign up is the same as logging in.** A new number (or Google account) creates an account. Both entrances
  have a sign-up view (`/login?mode=signup`, `/login/author?mode=signup`) linked from the header ("Log in / Sign
  up"), the phone menu, the home page and the footer.
- **Continue with Google** appears on both entrances automatically once Google is switched on in Supabase (see
  "Google sign-in setup" below). Google accounts start as readers (or authors via the author entrance) and
  need no phone number. A Google sign-in and a mobile-number sign-in are separate accounts unless the person
  connects Google in Settings → Ways to sign in.
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
- **Free sample ("Read sample").** Every book page has a Read sample button next to Buy, or "Sample coming
  soon". On the **Free sample** step (Details → Files → Pricing → Free sample → Preview → Submit) the author
  either picks a page range from their manuscript (at most 10% of the book, never more than 30 pages) or
  uploads their own sample PDF (same limit, up to 9 MB). That makes a **private draft** (manuscripts bucket);
  the author previews it, then approves it, and only then is a separate copy (without the source file's
  metadata) published in the public `book-samples` bucket. New books can't be submitted or approved without an
  approved sample; books already live keep selling and show an author dashboard task and an admin filter
  (Review queue → Live → "Only books without a free sample"). Replacing the manuscript never changes the
  sample; the author is told it was made from an older version. Readers open it at `/books/<slug>/sample`, a
  full-screen pdf.js reader (page buttons, swipe, zoom, close, Buy) that needs no login. The public sample can
  be saved or screenshotted like any web page; only the full manuscript is protected. The pdf.js worker is
  copied to `public/pdf.worker.min.mjs` by `npm install` (postinstall).

### Design system ("Cupertino Editorial")

Visual reference: the Stitch export (screens 01–24 and a component sheet). Functional reference: the
80-screen brief. The live, per-screen checklist is `docs/redesign-checklist.md` (regenerate it with
`python3 docs/redesign_checklist.py` after editing `docs/redesign-status.json`).

Tokens live in `src/app/globals.css`, in light and dark versions:
- Surfaces: white and system grey `#F5F5F7` (black and `#1C1C1E` in dark mode); warm ivory `#FBF8F2` behind
  the bookstore, book pages and reading.
- Lines: hairlines `#E5E5EA`, input borders `#D1D1D6`.
- Colours: navy `#17214A` for main actions; cobalt `#4A63C9` for focus and links; marigold `#C98200`
  with dark ink only for buying (Buy now, Pay, Get Pro). Tints for info, warning, danger and success
  notices.
- Shape: radii of 10 px (controls), 14 px (cards) and 18 px (dialogs, sheets, reading panels);
  hairline cards without heavy shadows; a book-spine shadow on covers.
- Fonts (all via `next/font` in `src/app/layout.tsx`, wired through `--font-sans`, `--font-serif`, `--font-mono`):
  Inter for every interface element and all numbers (600 headlines, 500 navigation and buttons, 400 body);
  Noto Sans Devanagari for Hindi (normal letter spacing, taller lines); Source Serif 4 only for article
  bodies, samples and literary excerpts; JetBrains Mono only for identifiers (`id-mono`: order IDs,
  Edition IDs, references; never wraps). Tables, statistics and calculators use tabular digits.
- Money: `rupees()` and `formatPaise()` use the Indian locale. Whole amounts drop decimals in prose (₹299);
  pass `true` for a fixed two decimals (₹299.00), which every money table and the Finance page use so a
  column shares one precision.

Design pack (Apple-inspired brief, `public/graphics/`): the homepage hero and the author section use the
supplied artwork (`eliphas-hero`, `eliphas-publishing-journey`; WebP served, PNG originals kept) on ivory
"paper panels" that stay ivory in dark mode. They are decorative concept books, never catalogue items.
New components: `Book3D` (real cover, spine, page edges and depth from the page count; follows the
pointer only with a mouse, static on touch and for reduced motion), `Reveal` (scroll fade, visible
without JavaScript), `BeforeAfter` (keyboard-accessible slider), `QuickLook` (native dialog; bottom
sheet on phones) and `EditionIdStory`.

Shared building blocks (utility classes):
- Buttons: `btn-primary`, `btn-ghost`, `btn-tinted` (grey, e.g. Read sample), `btn-accent`/`btn-buy`
  (buying only), `btn-quiet`, `btn-danger`.
- Forms: `field` (cobalt focus halo; shows `aria-invalid`), `label`, `hint`.
- Layout: `card`, `group-list`/`group-row` (inset grouped lists), `segmented`/`segment` (iOS/macOS
  segmented controls), `chip`.
- Labels and notices: `badge`, `badge-verified` (pale cobalt), `badge-pro` (cream and marigold; never
  confused with Verified), `notice-info`/`-warn`/`-danger`/`-success`.
- Overlays: `dialog-backdrop`, `dialog-panel`, `sheet-panel`.
- Text and data: `mono`, `display` (serif headings), `glass` (header and tab bar), `.ledger` tables.
  Data tables everywhere get ledger-style headers.

Components:
- Navigation: `SiteHeader` (glass bar with a segmented main nav), `SiteTabBar`, `AppShell` (260 px
  sidebar on desktop, tab bar with a **More** sheet on phones).
- Books: `BookCard` (tile), `BookRow` (bookstore result row).
- Pages and states: `PageHeader`, `EmptyState`, `LegalPage`.
- Actions: `ShareButton`, `PrintButton`, `AutoSubmitSelect`.

Where the Stitch mock content conflicted with how Eliphas actually works, the real rules were kept
and the conflict is recorded in the checklist. Examples:
- Pricing: GST rates, Pro prices and discounts; ePub and digital formats.
- Made-up content: ratings and review counts, "cryptographic" EEID claims, reading circles.
- Privacy: reader libraries and reading progress on public profiles are not shown.
- Missing backend: a contact form with no server-side inbox.

Behaviour: `useFormAction` keeps typed input on errors, ignores double submits, turns a dropped connection
into a clear "try again" message and can warn about unsaved changes (`warnUnsaved`); `offlineSafe()` does the
same for direct action calls; file uploads show a percentage (`src/lib/upload.ts`). There's a visible focus
ring for keyboard users, a "Skip to content" link, and animations are switched off for people who ask for
reduced motion.

### Community updates, file versions and reviews

- **Community** (`/community`; see the 000015 section below for the current rules): posts (up to 3,000
  characters, one image with alt text, one of their published books), save drafts, edit, unpublish and
  delete. Readers get **Discover** (everyone, newest first) and **Following** feeds, like (once per account),
  reply, share, report and block. Followers get one in-app notification on first publication, if they keep
  "Community updates" on in Notifications; edits and republishing never notify again. Reports go to
  Admin → Moderation (hide, restore, remove, with reasons). Replies are rate limited.
- **File versions**: every manuscript, print cover and cover upload is stored as its own file and listed in
  `book_file_versions` (Files step → File versions). Approving a book pins the exact versions in
  `books.approved_files`; each order records them in `order_items.file_snapshot`, and printers download
  those approved files (shown as "approved vN"). Older books fall back to their current files.
- **Preview step** (Details → Files → Pricing → Free sample → Preview → Submit): authors see the bookstore page, open
  each file, and confirm the versions they are submitting. Uploading again clears the confirmation.
- **Earnings & payouts** (`/author/earnings`): totals, money on delivered orders not yet paid, pending
  orders, payouts, and each order line's stored breakdown (selling price, printing, commission, GST on
  commission, payment charge marked "estimated" when it is). Nothing is recalculated with today's rates.
- **Authors** (`/authors`) lists authors with a live book or article. Book pages have **Follow** and
  **Reader reviews** (see below). No rating is shown until real reviews exist.

### Verification, community for everyone and reviews (migration 000015)

- **Author verification.** Account → Author verification: pen name, short bio, writing language and
  authorship evidence (links, ISBNs, publications). ID documents and Aadhaar-style numbers are refused.
  Status: pending → approved / changes requested / not approved; an admin can later remove the badge.
  Admin → Authors has Applications (with the private evidence), **Existing authors to review** (authors from
  before this release are *not* verified automatically; verifying never touches their books), Verified, and
  History. Every change records who, when and why (`author_verification_events`, audit log); only admins can
  set `profiles.verified_author_at` (database trigger). The badge says it isn't an endorsement and is separate
  from Pro. Verified authors can write **articles** (already-published articles stay up) and link their books
  in posts.
- **Community** is for every member: posts up to 3,000 characters with one image, edit/delete, likes,
  comments with one level of replies (paginated), share, private bookmarks (Account → Saved → Community
  posts), report and block. Discover (everyone, newest first) and Following feeds; profiles at `/authors/…`
  or `/u/…` (name, bio, photo and posts only). Reading needs no login; actions send guests to log in and
  then finish the action.
- **Notifications** (in-app only, never SMS/email/push, one per event): new follower, comments and replies on
  your content, an author's response to your review, new posts/articles from people you follow, and
  verification decisions. Each type except verification can be turned off in Notifications.
- **Blocking** hides each other's posts and comments, stops follows, comments and notifications both ways.
  It can't hide public pages from logged-out visitors, and the block dialog says so.
- **Reviews**: any logged-in member except the book's author can rate and review a book once (editable,
  deletable). **Verified purchase** is shown only when an order of that book was delivered to them and not
  cancelled or refunded, worked out every time the page loads. Averages use published reviews only. Authors
  can post one labelled public response, never delete reviews. Moderation (Admin → Moderation) is for abuse,
  not negative opinions; the policy is shown under the reviews.
- **Community guidelines** (`/community-guidelines`, linked from the footer, Community, comments, reviews
  and the verification form): what's welcome, what's removed, how reviews, verification, reporting and
  blocking work. Draft wording: have it reviewed before launch.
- **Private file locations** (migration 000016): the manuscript, print cover, sample draft and approved-file
  columns on `books` can't be read through the public API by guests or members (column-level grants). The app
  reads them on the server after checking the person is the book's author or an admin. When you add a new
  column to `books` that should be public, grant it: `grant select (new_col) on public.books to anon, authenticated;`.

### Eliphas Edition IDs and QR codes (migration 000017)

- **What it is.** Each approved edition/format (each `books` row: its own binding and language) gets a permanent
  ID such as `EEID-2026-000123` and a public page at `/e/{EEID}`. It's our own identifier: not an ISBN (still the
  separate `isbn` field), not a copyright registration, and not proof that a printed copy is genuine. Every copy
  of an edition shares the same QR.
- **Assignment.** On admin approval, before the book goes live, the database function `assign_eeid` takes the
  next number from a sequence (`eeid_seq`), locks the book row and stores the ID. Repeated or simultaneous
  approvals return the same ID; numbers are never reused (gaps are fine). The year is the year of assignment in
  India. A trigger makes the ID immutable; books with an ID can't be deleted, and `edition_ids` keeps every ID
  ever issued. Drafts and submissions get none. Price changes, corrections, reprints and unpublish/republish keep
  the ID. Authors can mark a book as another format/edition of one of their works (Details → "Another format or
  edition of"); it still gets its own ID.
- **Workflow.** Submission → admin approval + EEID → (optional) final files → publication. In Admin → book, either
  **Approve and publish** (assigns the ID and publishes) or **Approve, assign EEID and request final files** (assigns
  the ID and sends it back so the author can add the QR label to the print cover; on resubmission the ID is kept).
- **Revised print cover while live.** On a live book the author can upload a new print cover (Files step). It is
  stored as a new version, flagged for print review, and orders keep printing the approved cover until an admin
  approves it (Admin → book → "Approve revised files for printing" or "Keep the approved cover"). Orders already
  placed never change. No PDF cover editor was built; authors place the downloadable label themselves.
- **Author.** Book → Submit step → **Edition identity**: the EEID, status, QR preview, copy EEID/link, QR as PNG
  (1200 px) or SVG, and a vector print-label PDF (50 × 46 mm, QR 30 mm with a 4-module quiet zone, EEID and "Scan
  to explore this book"). Recommended printed size 25–30 mm. Authors can only see their own editions' assets.
- **Admin.** The Edition identity card and actions on each book; exact EEID search in the review queue; **Admin →
  Edition IDs** for the QR address status, recent assignments and the **backfill** (dry-run count first, then a
  confirmed run; idempotent; uses the year it's run). Nothing is backfilled automatically. **Remove edition** takes
  an edition down with a private reason; its page becomes a neutral "not available" notice and its ID stays reserved.
- **Public page** `/e/{EEID}`: cover, title, author link, EEID, edition, format, language, ISBN (only if set),
  publication date, Read sample and Buy. "Not yet available" before publication (no draft details), "isn't on
  sale right now" when unpublished, a neutral notice when removed, and 404 for unknown IDs.
- **QR address.** QR codes use `PUBLIC_SITE_ORIGIN` (validated: https, a real domain, no path; localhost, preview
  and storage hosts are refused). Without it, previews are labelled "not for print" and downloads are off, with an
  admin message explaining what to set.

### Distribution requests (migration 000019)

Intake and review only: no retailer is connected, nothing is submitted, charged or paid, and royalties are unchanged.
See [`docs/DISTRIBUTION-HANDOFF.md`](docs/DISTRIBUTION-HANDOFF.md) for limits and the activation checklist.

- **Author → Distribution** (`/author/distribution`): pick one of your published books and a channel (Amazon India,
  Flipkart or International), enter country of residence and target countries, and confirm distribution rights.
  One request per book and channel (database unique constraint); requested channels show as "Already requested".
  The list shows each request's status and the team's note.
- **Admin → Distribution** (`/admin/distribution`): Open / Declined / All queue. Set a status (In review, Needs
  information, Declined) with a note the author sees. The database records who reviewed and when, and a save made
  from an out-of-date page is rejected ("Someone updated this request…") instead of overwriting.
- **Channel margin calculator** (admin): a planning tool with example numbers. Not commercial pricing; it doesn't
  create quotes or touch the existing fee and royalty calculations.
- **Security.** Authors can read only their own requests and can create them only for their own live books; they
  can't set status, notes or reviewer fields, edit or delete requests. Only admins can review.

### Google sign-in setup (about 10 minutes)

1. **Google Cloud Console** → APIs & Services → **OAuth consent screen**: External, app name "Eliphas Indicus
   Publications", your support email, logo optional; add your domain under Authorised domains. Publish the app.
2. **Credentials** → Create credentials → **OAuth client ID** → Web application.
   - Authorised JavaScript origins: `https://your-domain.in`
   - Authorised redirect URI: `https://<your-project-ref>.supabase.co/auth/v1/callback`
     (shown in Supabase → Authentication → Sign In / Providers → Google → "Callback URL").
   Copy the **Client ID** and **Client secret**.
3. **Supabase** → Authentication → Sign In / Providers → **Google**: enable, paste the Client ID and secret, save.
4. **Supabase** → Authentication → **URL Configuration**: Site URL `https://your-domain.in`; add Redirect URLs
   `https://your-domain.in/auth/callback` (and your Vercel preview pattern, e.g. `https://*-your-team.vercel.app/**`,
   if you test on previews).
5. Optional: Authentication → Sign In / Providers → turn on **Allow manual linking** so people can connect Google to
   their existing mobile-number account (Settings → Ways to sign in).
6. Within 5 minutes the "Continue with Google" button appears on `/login` and `/login/author`. Try it once with your
   own Google account.

Admin and printer roles are still given by phone number (`role_invites`) or by an admin; a Google sign-up is never
made admin automatically.

### Release checklist (decisions and configuration still needed)

Built and tested locally in test mode; not production-ready until these are done:
- **Tax**: Pro is ₹299 + 18% GST (₹352.82) and commission GST is 18%, as configured in Admin → Plans.
  These are proposed settings; have your accountant confirm GST registration, rates and any TDS/TCS duty
  before going live. No withholding is applied today.
- **Payments**: Razorpay live keys and webhook secret (Vercel env); Pro is prepaid monthly with manual
  renewal (no recurring billing is configured). Payment success is verified on the server and webhooks are
  idempotent.
- **SMS/OTP**: a production SMS provider with DLT approval; remove the test phone numbers.
- **Shipping**: real zones and weight rates in Admin → Shipping (seeded rates are samples); no live courier
  API is connected, so quotes come from these admin rates.
- **Policies**: business details, refund/cancellation and service terms reviewed by a lawyer; community
  guidelines and review policy (drafted at `/community-guidelines`) and the verification evidence you'll accept.
- **Verification**: review the existing authors in Admin → Authors → Existing authors to review.
- **Edition IDs**: set `PUBLIC_SITE_ORIGIN` to the production domain, then run the backfill in Admin → Edition IDs
  (dry run first) for books published before EEIDs.
- **Not built in this release**: paid AI review, tips, direct messages, international delivery, email or
  push notifications (in-app only), automated copyright or manuscript checks.

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
