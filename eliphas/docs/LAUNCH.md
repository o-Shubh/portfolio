# Going live: the manual steps

Everything that can be built is built and tested. What's left needs your accounts, money, documents or decisions.
Work top to bottom. Admin → **Overview** shows a live checklist of what the app can check for itself.

Time needed: about a day of your time, plus waiting for Razorpay KYC and SMS DLT approval (a few days each). Start
those two first.

## 1. Start the slow approvals today
- [ ] **Razorpay KYC** (dashboard.razorpay.com → Activate account). Needs PAN, bank account, business details and the
      website's policy pages (Contact, Terms, Privacy, Refunds, Shipping). Fill Admin → Settings → Business details
      first so those pages are complete.
- [ ] **SMS provider with DLT** for OTP login in India (Twilio, MessageBird, Textlocal or Vonage, as supported by
      Supabase). DLT registration of the sender ID and OTP template takes a few days.

## 2. Domain
- [ ] Buy the domain (e.g. from GoDaddy, Namecheap, Hostinger or BigRock).
- [ ] Later, in step 3, point it at Vercel with the DNS records Vercel shows you (usually an `A` record and a
      `CNAME` for `www`). HTTPS is automatic.

## 3. Hosting: Vercel
The code is on GitHub `o-Shubh/portfolio`, branch `main`, folder `eliphas`. Full click-by-click steps are in the
README under "Deploy to Vercel".
- [ ] Vercel → Add New → Project → import `portfolio`, **Root Directory** `eliphas`. Production branch `main`.
- [ ] Environment variables (Production):

  | Name | Value |
  |---|---|
  | `NEXT_PUBLIC_SUPABASE_URL` | Supabase Project URL |
  | `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase publishable key |
  | `SUPABASE_SECRET_KEY` | Supabase secret key (private) |
  | `NEXT_PUBLIC_SITE_URL` | `https://your-domain.in` |
  | `PUBLIC_SITE_ORIGIN` | `https://your-domain.in` (for Edition ID QR codes) |
  | `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` | Live keys (`rzp_live_…`) once KYC is approved; test keys before that |
  | `RAZORPAY_WEBHOOK_SECRET` | A long random text, also entered in Razorpay (step 5) |
  | `RESEND_API_KEY` | From resend.com (order emails), step 5b |
  | `EMAIL_FROM` | e.g. `Eliphas Indicus <orders@your-domain.in>` (a domain verified in Resend) |
  | `EMAIL_REPLY_TO` | Optional: your support inbox, where customer replies go |
  | `CRON_SECRET` | A long random text; protects the daily job (email retries, invite rewards, Monday weekly email) |
  | `AUTH_EMAILS_ENABLED` | `true` once Supabase can send sign-in emails through your SMTP (step 4) |

- [ ] Settings → Domains → add your domain and follow the DNS instructions. Redeploy after changing variables.
- [ ] Test payments (the pretend payment window) never run on a hosted site. Without Razorpay keys, checkout is
      switched off rather than pretending.

## 4. Supabase (your existing project)
- [ ] All migrations up to `20261031000025_content_checks.sql` run (see "Database" below).
- [ ] Authentication → URL Configuration: **Site URL** `https://your-domain.in`; add `https://your-domain.in/**`
      to Redirect URLs.
- [ ] Authentication → Phone: real SMS provider details (step 1). **Remove the test phone numbers.**
- [ ] **Sign-in while SMS isn't ready.** The login page shows only the ways that work: the mobile-number form appears
      once the Phone provider is switched on. Until then, switch on at least one of these:
  - **Email + password (fastest, works today, no email setup):** Supabase → Authentication → Sign In / Providers →
    **Email**: enabled, and turn **Confirm email** off for now. People sign up with an email and password straight
    away. (Their email isn't verified until you turn Confirm email back on after the SMTP step below.)
  - **Google** (about 10 minutes, free): README → "Google sign-in setup".
  - **Email codes, confirming sign-ups and "Forgot password?"** need Supabase to send email. After your domain is
    verified in Resend (step 5b):
    1. Supabase → Authentication → **Emails → SMTP Settings**: enable custom SMTP. Host `smtp.resend.com`, port
       `465`, username `resend`, password = your Resend API key, sender e.g. `login@your-domain.in`, name
       "Eliphas Indicus". (Supabase's built-in email only reaches your own team, so this is required.)
    2. Supabase → Authentication → **Emails → Templates**: in **Magic link**, **Confirm signup** and **Reset password**,
       set a subject (e.g. "Your Eliphas sign-in code") and paste the body from `supabase/templates/sign-in-code.html`
       (for Reset password, use `supabase/templates/reset-password.html`).
    3. Vercel → Environment variables: `AUTH_EMAILS_ENABLED` = `true`, then redeploy. "Email me a code" and
       "Forgot password?" appear on the login pages. Now turn **Confirm email** back on.
  - Each way of signing in makes its own account; people can connect Google to their account in Settings.
- [ ] Optional: Google sign-in (README → "Google sign-in setup").
- [ ] Database → Backups: confirm daily backups are on (paid plans) or take a manual backup before launch.
- [ ] Make your own number admin (README, Supabase step 4) and check nobody else has the admin role:
      `select phone, role from public.profiles where role = 'admin';`

## 5. Razorpay
- [ ] Webhooks → Add: URL `https://your-domain.in/api/razorpay/webhook`; events **payment.captured**,
      **payment.failed**, **refund.processed**, **refund.failed**; secret = `RAZORPAY_WEBHOOK_SECRET`.
      Do this for test mode and again for live mode (they're separate).
- [ ] Payment capture: keep **automatic capture** on (Settings → Payment capture). Orders are sent to print only
      after Razorpay confirms capture.
- [ ] After KYC: generate live keys, put them in Vercel, redeploy. Admin → Overview shows "Razorpay live keys" done.

## 5b. Email (order updates and contact form copies)
- [ ] Create a free account at resend.com, add your domain and add the DNS records it shows (at your domain
      registrar). Wait until Resend shows the domain as verified.
- [ ] Create an API key; put `RESEND_API_KEY`, `EMAIL_FROM` (and optionally `EMAIL_REPLY_TO`) and `CRON_SECRET` in
      Vercel; redeploy. Admin → Overview shows "Order emails set up".
- [ ] Place a test order with your own email: you should get "Order … confirmed". Admin → Emails lists every email
      and lets you retry failed ones (they're also retried once a day automatically).

## 6. Business setup in the admin
- [ ] Admin → Settings: business details; real print rates from your printer; spine thickness per paper; untick
      "These are sample rates".
- [ ] Admin → Printers: add each printer with the phone number they'll log in with.
- [ ] Admin → Shipping: real courier rates; untick "Sample rates" on every zone.
- [ ] Admin → Plans: accountant-approved GST settings (GST registered? GSTIN? rate) and TDS/TCS review.
- [ ] Admin → Edition IDs: once `PUBLIC_SITE_ORIGIN` is set, run the backfill (dry run first).
- [ ] Admin → Settings → Business details: the support email also receives a copy of every Contact form message
      (Admin → Messages has them all).
- [ ] Decide your payout schedule (e.g. monthly) and minimum. Admin → Payouts → Start payout run: download the sheet,
      pay each author by UPI or bank bulk transfer, then enter each reference (UTR) and mark it paid.
- [ ] FAQ promises (review time, delivery time) match what you can deliver: `src/content/faq.ts`.
- [ ] Admin → Content checks: look through the built-in word lists' purpose, add local words you want flagged, and
      allow words that cause false alarms. Have your lawyer read the "Books: content standards" section of the
      Community guidelines.
- [ ] Optional, any time after launch: the invite programme (Admin → Referrals). It is off with zero amounts until you
      set them. Have your accountant check how discounts and credit are treated for GST, and your lawyer read the
      Invite programme terms page, before switching it on. The daily job that gives rewards uses `CRON_SECRET`.

## 7. Legal
- [ ] Lawyer review of Terms, Privacy, Refunds, Shipping, author terms, Pro and service terms.
- [ ] Accountant review of commission, GST and payouts.
- [ ] Grievance officer named in Admin → Settings (required by Indian IT rules).

## 8. Real-money smoke test (before announcing)
With live keys, on the real domain:
- [ ] Log in with a real number (real SMS arrives).
- [ ] Buy one book with your own card or UPI. The order appears as Paid and reaches the printer's Jobs page.
- [ ] As admin, cancel it. Admin → Refunds shows nothing waiting once Razorpay confirms the refund (usually within
      minutes; the money reaches the card in 5–7 working days).
- [ ] Printer marks a test order printed, packed and shipped; the reader sees each step.
- [ ] Pay for Pro (or a small service quote) and refund it from the admin. Admin → Refunds lists it until Razorpay
      confirms it.
- [ ] In Razorpay → Webhooks, recent deliveries show 200 responses.

## Database
Run each new file in `supabase/migrations/` once, in order, in the SQL Editor. Never run `hosted-setup.sql` on the
existing database. Latest: `20261031000025_content_checks.sql`.

## Play Store (optional, after the site is live)
See [`PLAY-STORE.md`](PLAY-STORE.md): listing text, graphics, Data safety answers and the two Vercel settings.

## After launch
- Admin → Overview: "Refunds to check" and "New messages" should be 0; see Admin → Refunds and Admin → Messages.
- One daily job (`/api/cron/daily`, set up by `vercel.json`) retries failed emails, gives invite rewards and, on
  Mondays, sends the weekly email to readers who turned it on (Notifications → Weekly email).
- Admin → Emails: failed emails show here; they're retried daily.
- Admin → Referrals (if switched on): rewards are given daily; use "Give due rewards now" to run it by hand, and block
  invites or cancel rewards that look like misuse.
- Vercel → Logs for errors; Razorpay → Webhooks for failed deliveries (they're retried automatically).
- GitHub runs lint, typecheck, unit tests and a build on every pull request ("Eliphas checks").
