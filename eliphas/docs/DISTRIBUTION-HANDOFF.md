# Distribution request MVP

Implemented: author intake for own published books, duplicate protection per book/channel, ownership RLS, admin review with author-visible notes and stale-update protection, and a planning calculator. Navigation is included. All copy is English.

## Deploy
1. Review and apply `supabase/migrations/20261025000019_distribution_requests.sql` to the existing database using the normal migration workflow. Do not run the whole hosted-setup bundle against an existing database.
2. Deploy this branch after checks. No new environment variables.
3. Sign in as two distinct authors: request distribution for one author's published book; verify the other cannot read or create requests for it. Retry the request and confirm duplicate protection. Check unpublished and removed books cannot be requested.
4. Sign in as admin, update status and note, then check the author sees it. Open two tabs and confirm a stale update is rejected. Verify ordinary authors cannot update review fields through the API.

## Explicit limits
This is intake and planning, not automatic Amazon/Flipkart/international publishing. It does not charge money, issue commercial quotes, change existing royalties, connect retailer APIs, enable international sign-up, verify foreign tax details, or pay overseas authors. Country input is a self-declaration only. Requests are capped to the latest 100 on the initial screens; add pagination as volume grows. Review notes keep the latest value, not a complete audit history.

## Activation checklist
- Contract with each retailer/distributor and verify catalogue creation versus seller listing capabilities. Confirm ISBN, edition, territorial rights and file requirements. Never use EEID as an ISBN.
- Implement provider adapters and a durable queue with idempotency, retries, webhook signature validation and reconciled provider IDs before offering automation.
- Add immutable versioned quotes, author acceptance, channel-specific currencies and pricing, settlement reconciliation and an append-only earnings ledger. Confirm tax treatment, currency conversion, refunds, reserves and foreign-author payouts with the CA/legal adviser and providers.
- Enable country-specific email/phone onboarding and lawful payout/KYC collection before advertising support for international authors. Store sensitive documentation separately from intake notes.
- Publish supported countries and exclusions. Treat retailer approval and local POD coverage as eligibility conditions, not promises.

## Calculator
Inputs use minor units internally. Retailer receipts must already exclude retailer deductions. Remaining costs must exclude those same deductions to prevent double charging. The proposed share applies to positive receipts less remaining costs. Negative surplus is included as a platform loss; author earnings are floored at zero for this planning model only. Platform operating cost is then deducted to obtain contribution before monthly fixed costs. The entered minimum gates the preview only: no commercial quote or publication is activated by a passing result. Example defaults are not commercial pricing. Confirm actual tax basis, returns allowance and settlement costs for every channel.
