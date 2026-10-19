# Distribution requests

An author asks Eliphas to review one of their published books for **Amazon India**, **Flipkart** or
**international distribution**. An admin reviews it and leaves a note the author can see.

This is **intake and review only**. Nothing is submitted to a retailer, nothing is charged or paid, and the
existing fees and royalty calculations are unchanged. No screen says a book is "published on" Amazon or Flipkart.

## What's built

| Area | Where | What it does |
|---|---|---|
| Author | `/author/distribution` (sidebar → Distribution; phone → More) | Request a review for one of your live books: channel, country of residence, target countries, rights confirmation. See status and the team's note. |
| Admin | `/admin/distribution` (sidebar → Distribution) | Open / Declined / All queue. Set **In review**, **Needs information** or **Declined** with a note (5–2,000 characters). |
| Calculator | Admin page | Planning only, example defaults. Not commercial pricing; creates no quote. |
| Database | `supabase/migrations/20261025000019_distribution_requests.sql` | Table, row-level security, column grants, review stamp trigger. |

### Rules the database enforces (not just the screens)

- Authors read only their own requests. Anonymous visitors read nothing.
- Authors create requests only for **their own published, not-removed** books (checked by
  `can_request_distribution`, because `removed_at` is not readable by authors).
- One request per book and channel (unique constraint). A stale browser tab gets a clear "already requested" message.
- Authors can't set status, notes, reviewer or timestamps, and can't edit or delete a request.
- Only admins update, and only `status` and `review_note`. A trigger records `reviewed_by`, `reviewed_at` and a
  fresh `updated_at`. A save from an out-of-date page matches no row and is rejected instead of overwriting.
- Deleting a book removes its requests (cascade).

## Deploy

1. **Back up** the database (Supabase → Database → Backups).
2. In Supabase → SQL Editor, run **only** the distribution migrations not yet applied, in order:
   `supabase/migrations/20261025000019_distribution_requests.sql`, then `20261026000020_distribution_replies.sql`.
   000019 creates the table and two functions; 000020 adds the reply columns, one function and the `distribution`
   notification type. Neither changes existing rows. **Do not run `hosted-setup.sql` on an existing database** (that file is only for a
   brand-new project).
3. Check it worked: `select count(*) from public.distribution_requests;` runs without an error (after 000020:
   `select author_reply from public.distribution_requests limit 1;` also runs).
4. Deploy the app (merge the PR; Vercel deploys `main`). No new environment variables.
5. Smoke test on the live site: as an author, request one channel for a published book and confirm it appears as
   "Requested"; as an admin, set "Needs information" with a note; as the author, confirm the note and a notification
   show, then send a reply and confirm the admin sees it.

Rollback (only if needed, before real requests exist):
`drop table public.distribution_requests; drop function public.stamp_distribution_review(); drop function public.can_request_distribution(uuid);`

## Known limits (deliberate in this version)

- No approval status. There is no "eligible" or "listed" state, because there is no integration or agreed terms.
  When terms exist, add a status and the acceptance flow together.
- Authors can reply once each time we ask for information (migration 000020); the reply and any corrected countries
  send the request back to the open queue. Only the latest reply is kept.
- A declined request can't be re-sent by the author for the same book and channel. An admin can reopen it by setting
  "In review" or "Needs information" from the Declined filter.
- Each review sends the author one in-app notification (never SMS or email).
- Country fields are free-text self-declarations, not verified.
- Lists show the latest 100 requests. Add pagination when volume grows.
- Each review keeps the latest note only, not a full history.

## Before anything goes live with a retailer

- Contract with each retailer or distributor. Confirm catalogue creation versus seller listing, ISBN, territorial
  rights and file requirements. **An EEID is never an ISBN.**
- Build provider integrations behind a durable queue: idempotency, retries, signed webhooks, stored provider IDs.
- Versioned quotes the author accepts, channel currencies and prices, settlement reconciliation, and an append-only
  earnings ledger. Confirm tax, currency conversion, returns, reserves and refunds with the CA.

## International authors: what's missing

Already works: login accepts phone numbers from 32 countries (`src/lib/phone.ts`), provided the SMS provider can
deliver there.

Not built:

1. **Payouts.** Authors are paid by UPI only (`profiles.payout_upi`), which works only with Indian bank accounts.
   Overseas authors need another method (international bank transfer, PayPal or Wise) and a provider that supports it.
2. **Tax and KYC.** Indian tax rules for paying non-residents (for example withholding tax, tax-treaty forms,
   foreign tax IDs) need CA advice, then secure collection and storage separate from request notes. Author
   verification today checks published work, not identity, so payout KYC would be a new process.
3. **Addresses and shipping.** Checkout, shipping zones and printer routing are India-only (PIN codes).
   Selling print copies abroad needs a print partner or retailer coverage in those countries.
4. **Currency.** All prices and earnings are in rupees.
5. **Legal pages.** Terms, privacy and royalty terms would need updating for overseas authors and readers.

Business decisions needed: which countries first, payout provider, tax treatment, retailer partners and commercial
terms (fees and royalty shares for each channel).
