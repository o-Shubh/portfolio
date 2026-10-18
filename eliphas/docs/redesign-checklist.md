# Redesign screen checklist

Visual reference: Stitch export "Cupertino Editorial" (screens 01–24 except 20, plus a shared component sheet).
Functional reference: Eliphas-Screen-Brief.pdf (80 screens). Source of truth for business rules: the existing code.

Status keys. Implementation: **done** (built to the shared system and the reference/brief), **partial**, **todo**. 
Verification: **checked** (browser screenshot reviewed + automated checks), **auto** (automated checks only), **—** (not yet).

| # | Screen | Route | Stitch ref | Implementation | Verification | Blockers / notes |
|---|---|---|---|---|---|---|
| | **Public website** | | | | | |
| 1 | Home | `/` | 01 | done | screenshots 1440/390 vs Stitch 01; no sideways scroll | Spotlight uses the newest real book; QR is real when an EEID exists |
| 2 | Bookstore | `/books` | 02 | done | screenshots 1440/390 vs Stitch 02; m2 passed; sort/filter checked | Fake ratings, 'Verified EEID only', fulfilment filters and table view left out (no real data) |
| 3 | Book page | `/books/{book}` | 03 | todo | — |  |
| 4 | Sample reader | `/books/{book}/sample` | 04 | todo | — |  |
| 5 | Authors directory | `/authors` | 05 | todo | — |  |
| 6 | Author profile | `/authors/{name}` | 06 | todo | — |  |
| 7 | Reader profile | `/u/{name}` | 07 | todo | — |  |
| 8 | Articles | `/articles` | 08 | todo | — |  |
| 9 | Article | `/articles/{article}` | 09 | todo | — |  |
| 10 | Community feed | `/community` | 10 | todo | — |  |
| 11 | Post | `/community/{post}` | 11 | todo | — |  |
| 12 | Edit post | `/community/{post}/edit` | 12 | todo | — |  |
| 13 | Edition page (QR target) | `/e/{EEID}` | 13 | todo | — |  |
| 14 | Cart | `/cart` | 14 | todo | — |  |
| 15 | Checkout (cart) | `/checkout` | 15 | todo | — |  |
| 16 | Checkout (one book) | `/checkout/{book}` | 16 | todo | — |  |
| 17 | Pricing | `/pricing` | 17 | todo | — |  |
| 18 | FAQ | `/faq` | 18 | todo | — |  |
| 19 | Contact | `/contact` | 19 | todo | — |  |
| 20 | Community guidelines | `/community-guidelines` | — | todo | — |  |
| 21 | Terms of use | `/terms` | 21 | todo | — |  |
| 22 | Privacy policy | `/privacy` | 22 | todo | — |  |
| 23 | Refunds | `/refunds` | 23 | todo | — |  |
| 24 | Shipping policy | `/shipping` | 24 | todo | — |  |
| | **Sign in and sign up** | | | | | |
| 25 | Reader login / sign up | `/login (?mode=signup)` | — | todo | — |  |
| 26 | Author login / sign up | `/login/author (?mode=signup)` | — | todo | — |  |
| 27 | Start publishing | `/login/author/start` | — | todo | — |  |
| 28 | Welcome setup | `/onboarding` | — | todo | — |  |
| | **Reader account** | | | | | |
| 29 | My orders | `/account` | — | todo | — |  |
| 30 | Order details | `/account/orders/{order}` | — | todo | — |  |
| 31 | Saved | `/account/saved` | — | todo | — |  |
| 32 | Notifications | `/account/notifications` | — | todo | — |  |
| 33 | Settings & help | `/account/profile` | — | todo | — |  |
| 34 | Author verification | `/account/verification` | — | todo | — |  |
| | **Author workspace** | | | | | |
| 35 | Overview | `/author` | — | todo | — |  |
| 36 | My books | `/author/books` | — | todo | — |  |
| 37 | New book | `/author/books/new` | — | todo | — |  |
| 38 | Book · Details | `/author/books/{id}/details` | — | todo | — |  |
| 39 | Book · Files | `/author/books/{id}/files` | — | todo | — |  |
| 40 | Book · Pricing | `/author/books/{id}/print` | — | todo | — |  |
| 41 | Book · Free sample | `/author/books/{id}/sample` | — | todo | — |  |
| 42 | Book · Preview | `/author/books/{id}/preview` | — | todo | — |  |
| 43 | Book · Submit | `/author/books/{id}/submit` | — | todo | — |  |
| 44 | Earnings & payouts | `/author/earnings` | — | todo | — |  |
| 45 | Orders | `/author/orders` | — | todo | — |  |
| 46 | Analytics | `/author/analytics` | — | todo | — |  |
| 47 | My articles | `/author/articles` | — | todo | — |  |
| 48 | Article editor | `/author/articles/{id}` | — | todo | — |  |
| 49 | Article stats | `/author/articles/{id}/stats` | — | todo | — |  |
| 50 | My posts | `/author/community` | — | todo | — |  |
| 51 | Services | `/author/services` | — | todo | — |  |
| 52 | Service request | `/author/services/{id}` | — | todo | — |  |
| 53 | Request a creative | `/author/creatives/new` | — | todo | — |  |
| 54 | Service payments | `/author/payments` | — | todo | — |  |
| 55 | Payment details | `/author/payments/{id}` | — | todo | — |  |
| 56 | Pro membership | `/author/plan` | — | todo | — |  |
| | **Admin** | | | | | |
| 57 | Admin overview | `/admin` | — | todo | — |  |
| 58 | Review queue | `/admin/review` | — | todo | — |  |
| 59 | Book review | `/admin/books/{id}` | — | todo | — |  |
| 60 | Authors | `/admin/authors` | — | todo | — |  |
| 61 | Edition IDs | `/admin/editions` | — | todo | — |  |
| 62 | Moderation | `/admin/moderation` | — | todo | — |  |
| 63 | Orders | `/admin/orders` | — | todo | — |  |
| 64 | Finance | `/admin/finance` | — | todo | — |  |
| 65 | Payouts | `/admin/payouts` | — | todo | — |  |
| 66 | Subscriptions | `/admin/subscriptions` | — | todo | — |  |
| 67 | Plans | `/admin/plans` | — | todo | — |  |
| 68 | Services | `/admin/services` | — | todo | — |  |
| 69 | Service order | `/admin/services/orders/{id}` | — | todo | — |  |
| 70 | Printers | `/admin/printers` | — | todo | — |  |
| 71 | New printer | `/admin/printers/new` | — | todo | — |  |
| 72 | Edit printer | `/admin/printers/{id}` | — | todo | — |  |
| 73 | Shipping | `/admin/shipping` | — | todo | — |  |
| 74 | Settings | `/admin/settings` | — | todo | — |  |
| 75 | Issues | `/admin/issues` | — | todo | — |  |
| | **Printer** | | | | | |
| 76 | Print jobs | `/printer` | — | todo | — |  |
| 77 | Print order | `/printer/orders/{id}` | — | todo | — |  |
| | **System screens** | | | | | |
| 78 | Page not found | `(any missing page)` | — | todo | — |  |
| 79 | Something went wrong | `(error)` | — | todo | — |  |
| 80 | Offline | `(installed app, no connection)` | — | todo | — |  |

## Resume here

Stage 1 shared system done except the dialog/sheet/toast pass. Stage 2: screens 1 (home) and 2 (bookstore) are done. Next: screen 3, the book page src/app/(site)/books/[slug]/page.tsx, compared with Stitch 03 at 1440 and 390. Helper scripts live in the session scratchpad: restart.sh, shot.mjs, side.mjs.
