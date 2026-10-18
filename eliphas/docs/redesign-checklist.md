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
| 3 | Book page | `/books/{book}` | 03 | done | screenshots 1440/390; no sideways scroll (also 768) | Stitch quantity stepper, formats/ePub, TOC, fake appraisals left out (no real data) |
| 4 | Sample reader | `/books/{book}/sample` | 04 | done | typecheck; reader test m15/m17 pending in final run | PDF sample (real file), so no reflow/theme controls; end-of-sample buy panel added |
| 5 | Authors directory | `/authors` | 05 | done | screenshots 1440/390; no sideways scroll | Verified filter uses real verification records |
| 6 | Author profile | `/authors/{name}` | 06 | done | screenshots 1440/390; no sideways scroll | No Pro/academic credentials shown (not real data) |
| 7 | Reader profile | `/u/{name}` | 07 | done | typecheck | Library/reading progress from Stitch NOT shown: private data |
| 8 | Articles | `/articles` | 08 | done | screenshots 1440/390; no sideways scroll | No citations/DOI (not real data) |
| 9 | Article | `/articles/{article}` | 09 | done | screenshots 1440/390; no sideways scroll | Outline built from the article's own headings |
| 10 | Community feed | `/community` | 10 | done | typecheck + lint | Channels/'reading circles'/online status from Stitch omitted (no such data) |
| 11 | Post | `/community/{post}` | 11 | done | typecheck + lint | Linked book card in sidebar uses the real book |
| 12 | Edit post | `/community/{post}/edit` | 12 | done | typecheck + lint | Editor kept; no fake window controls |
| 13 | Edition page (QR target) | `/e/{EEID}` | 13 | done | m18 passed | EEID copy kept honest (no 'cryptographic proof' claims) |
| 14 | Cart | `/cart` | 14 | done | m11 re-run pending | Suggestions are real published books |
| 15 | Checkout (cart) | `/checkout` | 15 | done | m11 re-run pending | Visual only; payment logic untouched |
| 16 | Checkout (one book) | `/checkout/{book}` | 16 | done | m11 re-run pending | Visual only; payment logic untouched |
| 17 | Pricing | `/pricing` | 17 | done | typecheck + lint | Real plans, commission and GST from settings; Stitch tiers/prices not used |
| 18 | FAQ | `/faq` | 18 | done | typecheck + lint | FAQ content unchanged |
| 19 | Contact | `/contact` | 19 | done | typecheck + lint | No contact form: there is no server-side inbox; flagged |
| 20 | Community guidelines | `/community-guidelines` | — | done | typecheck + lint | No Stitch reference; uses the policy layout |
| 21 | Terms of use | `/terms` | 21 | done | typecheck + lint | Legal text unchanged |
| 22 | Privacy policy | `/privacy` | 22 | done | typecheck + lint | Legal text unchanged |
| 23 | Refunds | `/refunds` | 23 | done | typecheck + lint | Legal text unchanged |
| 24 | Shipping policy | `/shipping` | 24 | done | typecheck + lint | Legal text unchanged |
| | **Sign in and sign up** | | | | | |
| 25 | Reader login / sign up | `/login (?mode=signup)` | — | done | m19/m20 run pending | No Stitch reference; shared auth sheet |
| 26 | Author login / sign up | `/login/author (?mode=signup)` | — | done | m19/m20 run pending | No Stitch reference |
| 27 | Start publishing | `/login/author/start` | — | done | m19 run pending |  |
| 28 | Welcome setup | `/onboarding` | — | done | m19 run pending |  |
| | **Reader account** | | | | | |
| 29 | My orders | `/account` | — | done | typecheck + lint | Orders as an inset grouped list |
| 30 | Order details | `/account/orders/{order}` | — | partial | — | Shared system applied (cards, tables, figures, headers); per-screen review pending |
| 31 | Saved | `/account/saved` | — | partial | — | Shared system applied (cards, tables, figures, headers); per-screen review pending |
| 32 | Notifications | `/account/notifications` | — | partial | — | Shared system applied (cards, tables, figures, headers); per-screen review pending |
| 33 | Settings & help | `/account/profile` | — | partial | — | Shared system applied (cards, tables, figures, headers); per-screen review pending |
| 34 | Author verification | `/account/verification` | — | partial | — | Shared system applied (cards, tables, figures, headers); per-screen review pending |
| | **Author workspace** | | | | | |
| 35 | Overview | `/author` | — | partial | — | Shared system applied (cards, tables, figures, headers); per-screen review pending |
| 36 | My books | `/author/books` | — | partial | — | Shared system applied (cards, tables, figures, headers); per-screen review pending |
| 37 | New book | `/author/books/new` | — | partial | — | Shared system applied (cards, tables, figures, headers); per-screen review pending |
| 38 | Book · Details | `/author/books/{id}/details` | — | partial | — | Shared system applied (cards, tables, figures, headers); per-screen review pending |
| 39 | Book · Files | `/author/books/{id}/files` | — | partial | — | Shared system applied (cards, tables, figures, headers); per-screen review pending |
| 40 | Book · Pricing | `/author/books/{id}/print` | — | partial | — | Shared system applied (cards, tables, figures, headers); per-screen review pending |
| 41 | Book · Free sample | `/author/books/{id}/sample` | — | partial | — | Shared system applied (cards, tables, figures, headers); per-screen review pending |
| 42 | Book · Preview | `/author/books/{id}/preview` | — | partial | — | Shared system applied (cards, tables, figures, headers); per-screen review pending |
| 43 | Book · Submit | `/author/books/{id}/submit` | — | partial | — | Shared system applied (cards, tables, figures, headers); per-screen review pending |
| 44 | Earnings & payouts | `/author/earnings` | — | partial | — | Shared system applied (cards, tables, figures, headers); per-screen review pending |
| 45 | Orders | `/author/orders` | — | partial | — | Shared system applied (cards, tables, figures, headers); per-screen review pending |
| 46 | Analytics | `/author/analytics` | — | partial | — | Shared system applied (cards, tables, figures, headers); per-screen review pending |
| 47 | My articles | `/author/articles` | — | partial | — | Shared system applied (cards, tables, figures, headers); per-screen review pending |
| 48 | Article editor | `/author/articles/{id}` | — | partial | — | Shared system applied (cards, tables, figures, headers); per-screen review pending |
| 49 | Article stats | `/author/articles/{id}/stats` | — | partial | — | Shared system applied (cards, tables, figures, headers); per-screen review pending |
| 50 | My posts | `/author/community` | — | partial | — | Shared system applied (cards, tables, figures, headers); per-screen review pending |
| 51 | Services | `/author/services` | — | partial | — | Shared system applied (cards, tables, figures, headers); per-screen review pending |
| 52 | Service request | `/author/services/{id}` | — | partial | — | Shared system applied (cards, tables, figures, headers); per-screen review pending |
| 53 | Request a creative | `/author/creatives/new` | — | partial | — | Shared system applied (cards, tables, figures, headers); per-screen review pending |
| 54 | Service payments | `/author/payments` | — | partial | — | Shared system applied (cards, tables, figures, headers); per-screen review pending |
| 55 | Payment details | `/author/payments/{id}` | — | partial | — | Shared system applied (cards, tables, figures, headers); per-screen review pending |
| 56 | Pro membership | `/author/plan` | — | partial | — | Shared system applied (cards, tables, figures, headers); per-screen review pending |
| | **Admin** | | | | | |
| 57 | Admin overview | `/admin` | — | partial | — | Shared system applied (cards, tables, figures, headers); per-screen review pending |
| 58 | Review queue | `/admin/review` | — | partial | — | Shared system applied (cards, tables, figures, headers); per-screen review pending |
| 59 | Book review | `/admin/books/{id}` | — | partial | — | Shared system applied (cards, tables, figures, headers); per-screen review pending |
| 60 | Authors | `/admin/authors` | — | partial | — | Shared system applied (cards, tables, figures, headers); per-screen review pending |
| 61 | Edition IDs | `/admin/editions` | — | partial | — | Shared system applied (cards, tables, figures, headers); per-screen review pending |
| 62 | Moderation | `/admin/moderation` | — | partial | — | Shared system applied (cards, tables, figures, headers); per-screen review pending |
| 63 | Orders | `/admin/orders` | — | partial | — | Shared system applied (cards, tables, figures, headers); per-screen review pending |
| 64 | Finance | `/admin/finance` | — | partial | — | Shared system applied (cards, tables, figures, headers); per-screen review pending |
| 65 | Payouts | `/admin/payouts` | — | partial | — | Shared system applied (cards, tables, figures, headers); per-screen review pending |
| 66 | Subscriptions | `/admin/subscriptions` | — | partial | — | Shared system applied (cards, tables, figures, headers); per-screen review pending |
| 67 | Plans | `/admin/plans` | — | partial | — | Shared system applied (cards, tables, figures, headers); per-screen review pending |
| 68 | Services | `/admin/services` | — | partial | — | Shared system applied (cards, tables, figures, headers); per-screen review pending |
| 69 | Service order | `/admin/services/orders/{id}` | — | partial | — | Shared system applied (cards, tables, figures, headers); per-screen review pending |
| 70 | Printers | `/admin/printers` | — | partial | — | Shared system applied (cards, tables, figures, headers); per-screen review pending |
| 71 | New printer | `/admin/printers/new` | — | partial | — | Shared system applied (cards, tables, figures, headers); per-screen review pending |
| 72 | Edit printer | `/admin/printers/{id}` | — | partial | — | Shared system applied (cards, tables, figures, headers); per-screen review pending |
| 73 | Shipping | `/admin/shipping` | — | partial | — | Shared system applied (cards, tables, figures, headers); per-screen review pending |
| 74 | Settings | `/admin/settings` | — | partial | — | Shared system applied (cards, tables, figures, headers); per-screen review pending |
| 75 | Issues | `/admin/issues` | — | partial | — | Shared system applied (cards, tables, figures, headers); per-screen review pending |
| | **Printer** | | | | | |
| 76 | Print jobs | `/printer` | — | partial | — | Shared system applied (cards, tables, figures, headers); per-screen review pending |
| 77 | Print order | `/printer/orders/{id}` | — | partial | — | Shared system applied (cards, tables, figures, headers); per-screen review pending |
| | **System screens** | | | | | |
| 78 | Page not found | `(any missing page)` | — | done | typecheck + lint | 404 with search |
| 79 | Something went wrong | `(error)` | — | done | typecheck + lint | Error sheet with reference |
| 80 | Offline | `(installed app, no connection)` | — | done | typecheck + lint | Offline page; service worker cache bumped to v2 |

## Resume here

Screens 1-29 and 78-80 done; 30-77 have the shared system applied, per-screen review pending. Next: rebuild, logged-in screenshots of account/author/admin/printer at 1440/390, fix issues, then the full regression run (m1-m20 + menu) and the light/dark audit. Then push and open the PR after #17 merges.
