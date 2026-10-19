# Redesign screen checklist

Visual reference: Stitch export "Cupertino Editorial" (screens 01–24 except 20, plus a shared component sheet).
Functional reference: Eliphas-Screen-Brief.pdf (80 screens). Source of truth for business rules: the existing code.

Status keys. Implementation: **done** (built to the shared system and the reference/brief), **partial**, **todo**. 
Verification: **checked** (browser screenshot reviewed + automated checks), **auto** (automated checks only), **—** (not yet).

| # | Screen | Route | Stitch ref | Implementation | Verification | Blockers / notes |
|---|---|---|---|---|---|---|
| | **Public website** | | | | | |
| 1 | Home | `/` | 01 | done | design pack: screenshots 1440/1024/390, dark, 200% zoom, reduced motion, no-JS; m2 passed | Hero artwork (decorative), real featured books in Book3D, shelves with Quick look, publishing story, before/after sample, Edition ID illustration, final invitation |
| 2 | Bookstore | `/books` | 02 | done | screenshots 1440/390 vs Stitch 02; m2 passed; sort/filter checked | Fake ratings, 'Verified EEID only', fulfilment filters and table view left out (no real data); design pack: tiles with larger covers and Quick look |
| 3 | Book page | `/books/{book}` | 03 | done | design pack: screenshots 1440/390, dark, Hindi, 200% zoom | Book3D cover; open sections with dividers instead of cards; one primary Buy now |
| 4 | Sample reader | `/books/{book}/sample` | 04 | done | typecheck; reader test m15/m17 pending in final run | PDF sample (real file), so no reflow/theme controls; end-of-sample buy panel added |
| 5 | Authors directory | `/authors` | 05 | done | screenshots 1440/390; no sideways scroll; audit 360/390/768/1440 light + 390/1440 dark; regression suite passed | Verified filter uses real verification records |
| 6 | Author profile | `/authors/{name}` | 06 | done | screenshots 1440/390; no sideways scroll; audit 360/390/768/1440 light + 390/1440 dark; regression suite passed | No Pro/academic credentials shown (not real data) |
| 7 | Reader profile | `/u/{name}` | 07 | done | typecheck; audit 360/390/768/1440 light + 390/1440 dark; regression suite passed | Library/reading progress from Stitch NOT shown: private data |
| 8 | Articles | `/articles` | 08 | done | screenshots 1440/390; no sideways scroll; audit 360/390/768/1440 light + 390/1440 dark; regression suite passed | No citations/DOI (not real data) |
| 9 | Article | `/articles/{article}` | 09 | done | screenshots 1440/390; no sideways scroll; audit 360/390/768/1440 light + 390/1440 dark; regression suite passed | Outline built from the article's own headings |
| 10 | Community feed | `/community` | 10 | done | audit 360/390/768/1440 light + 390/1440 dark; regression suite passed | Channels/'reading circles'/online status from Stitch omitted (no such data) |
| 11 | Post | `/community/{post}` | 11 | done | audit 360/390/768/1440 light + 390/1440 dark; regression suite passed | Linked book card in sidebar uses the real book |
| 12 | Edit post | `/community/{post}/edit` | 12 | done | audit 360/390/768/1440 light + 390/1440 dark; regression suite passed | Editor kept; no fake window controls |
| 13 | Edition page (QR target) | `/e/{EEID}` | 13 | done | m18 passed | EEID copy kept honest (no 'cryptographic proof' claims) |
| 14 | Cart | `/cart` | 14 | done | screenshots via m11; m5/m11 checkout and payment suites passed | Suggestions are real published books |
| 15 | Checkout (cart) | `/checkout` | 15 | done | screenshots via m11; m5/m11 checkout and payment suites passed | Visual only; payment logic untouched |
| 16 | Checkout (one book) | `/checkout/{book}` | 16 | done | screenshots via m11; m5/m11 checkout and payment suites passed | Visual only; payment logic untouched |
| 17 | Pricing | `/pricing` | 17 | done | audit 360/390/768/1440 light + 390/1440 dark; regression suite passed | Real plans, commission and GST from settings; Stitch tiers/prices not used |
| 18 | FAQ | `/faq` | 18 | done | audit 360/390/768/1440 light + 390/1440 dark; regression suite passed | FAQ content unchanged |
| 19 | Contact | `/contact` | 19 | done | audit 360/390/768/1440 light + 390/1440 dark; regression suite passed | No contact form: there is no server-side inbox; flagged |
| 20 | Community guidelines | `/community-guidelines` | — | done | audit 360/390/768/1440 light + 390/1440 dark; regression suite passed | No Stitch reference; uses the policy layout |
| 21 | Terms of use | `/terms` | 21 | done | audit 360/390/768/1440 light + 390/1440 dark; regression suite passed | Legal text unchanged |
| 22 | Privacy policy | `/privacy` | 22 | done | audit 360/390/768/1440 light + 390/1440 dark; regression suite passed | Legal text unchanged |
| 23 | Refunds | `/refunds` | 23 | done | audit 360/390/768/1440 light + 390/1440 dark; regression suite passed | Legal text unchanged |
| 24 | Shipping policy | `/shipping` | 24 | done | audit 360/390/768/1440 light + 390/1440 dark; regression suite passed | Legal text unchanged |
| | **Sign in and sign up** | | | | | |
| 25 | Reader login / sign up | `/login (?mode=signup)` | — | done | m19 + m20 passed; audit screenshots 360-1440 | No Stitch reference; shared auth sheet |
| 26 | Author login / sign up | `/login/author (?mode=signup)` | — | done | m19 + m20 passed; audit screenshots 360-1440 | No Stitch reference |
| 27 | Start publishing | `/login/author/start` | — | done | m19 + m20 passed; audit screenshots 360-1440 |  |
| 28 | Welcome setup | `/onboarding` | — | done | m19 + m20 passed; audit screenshots 360-1440 |  |
| | **Reader account** | | | | | |
| 29 | My orders | `/account` | — | done | P3 review: screenshots 1280/390 (Oct 19) | Reviewed against the shared system; no per-screen change needed |
| 30 | Order details | `/account/orders/{order}` | — | done | P3 review: screenshots 1280/390 (Oct 19); changed and re-checked | Thank-you heading on the shared type scale; layout reviewed |
| 31 | Saved | `/account/saved` | — | done | P3 review: screenshots 1280/390 (Oct 19); changed and re-checked | Segmented tabs and a grouped list for saved articles |
| 32 | Notifications | `/account/notifications` | — | done | P3 review: screenshots 1280/390 (Oct 19); changed and re-checked | Two columns on wide screens; iOS-style switches; grouped lists for follows and blocks |
| 33 | Settings & help | `/account/profile` | — | done | P3 review: screenshots 1280/390 (Oct 19); changed and re-checked | Two columns; sign-in, general and help as grouped lists |
| 34 | Author verification | `/account/verification` | — | done | P3 review: screenshots 1280/390 (Oct 19); changed and re-checked | 'What helps' side panel; history as a grouped list |
| | **Author workspace** | | | | | |
| 35 | Overview | `/author` | — | done | P3 review: screenshots 1280/390 (Oct 19) | Reviewed against the shared system; no per-screen change needed |
| 36 | My books | `/author/books` | — | done | P3 review: screenshots 1280/390 (Oct 19); changed and re-checked | Grouped rows with status, last update and the next step |
| 37 | New book | `/author/books/new` | — | done | P3 review: screenshots 1280/390 (Oct 19) | Reviewed against the shared system; no per-screen change needed |
| 38 | Book · Details | `/author/books/{id}/details` | — | done | P3 review: screenshots 1280/390 (Oct 19) | Reviewed against the shared system; no per-screen change needed |
| 39 | Book · Files | `/author/books/{id}/files` | — | done | P3 review: screenshots 1280/390 (Oct 19) | Reviewed against the shared system; no per-screen change needed |
| 40 | Book · Pricing | `/author/books/{id}/print` | — | done | P3 review: screenshots 1280/390 (Oct 19) | Reviewed against the shared system; no per-screen change needed |
| 41 | Book · Free sample | `/author/books/{id}/sample` | — | done | P3 review: screenshots 1280/390 (Oct 19) | Reviewed against the shared system; no per-screen change needed |
| 42 | Book · Preview | `/author/books/{id}/preview` | — | done | P3 review: screenshots 1280/390 (Oct 19) | Reviewed against the shared system; no per-screen change needed |
| 43 | Book · Submit | `/author/books/{id}/submit` | — | done | P3 review: screenshots 1280/390 (Oct 19) | Reviewed against the shared system; no per-screen change needed |
| 44 | Earnings & payouts | `/author/earnings` | — | done | P3 review: screenshots 1280/390 (Oct 19); changed and re-checked | Deductions combined into one Costs column with the breakdown below; fits at 1280 |
| 45 | Orders | `/author/orders` | — | done | P3 review: screenshots 1280/390 (Oct 19); changed and re-checked | Fixed cut-off earnings column: four-column table on desktop, list on phones |
| 46 | Analytics | `/author/analytics` | — | done | P3 review: screenshots 1280/390 (Oct 19); changed and re-checked | Free plan: locked panel listing the real Pro analytics features |
| 47 | My articles | `/author/articles` | — | done | P3 review: screenshots 1280/390 (Oct 19) | Reviewed against the shared system; no per-screen change needed |
| 48 | Article editor | `/author/articles/{id}` | — | done | P3 review: screenshots 1280/390 (Oct 19) | Reviewed against the shared system; no per-screen change needed |
| 49 | Article stats | `/author/articles/{id}/stats` | — | done | P3 review: screenshots 1280/390 (Oct 19) | Reviewed against the shared system; no per-screen change needed |
| 50 | My posts | `/author/community` | — | done | P3 review: screenshots 1280/390 (Oct 19) | Reviewed against the shared system; no per-screen change needed |
| 51 | Services | `/author/services` | — | done | P3 review: screenshots 1280/390 (Oct 19) | Reviewed against the shared system; no per-screen change needed |
| 52 | Service request | `/author/services/{id}` | — | done | P3 review: screenshots 1280/390 (Oct 19) | Reviewed against the shared system; no per-screen change needed |
| 53 | Request a creative | `/author/creatives/new` | — | done | P3 review: screenshots 1280/390 (Oct 19) | Reviewed against the shared system; no per-screen change needed |
| 54 | Service payments | `/author/payments` | — | done | P3 review: screenshots 1280/390 (Oct 19); changed and re-checked | Empty state with next steps; title matches the menu ('Service payments') |
| 55 | Payment details | `/author/payments/{id}` | — | done | P3 review: screenshots 1280/390 (Oct 19) | Reviewed against the shared system; no per-screen change needed |
| 56 | Pro membership | `/author/plan` | — | done | P3 review: screenshots 1280/390 (Oct 19) | Reviewed against the shared system; no per-screen change needed |
| | **Admin** | | | | | |
| 57 | Admin overview | `/admin` | — | done | P3 review: screenshots 1280/390 (Oct 19) | Reviewed against the shared system; no per-screen change needed |
| 58 | Review queue | `/admin/review` | — | done | P3 review: screenshots 1280/390 (Oct 19) | Reviewed against the shared system; no per-screen change needed |
| 59 | Book review | `/admin/books/{id}` | — | done | P3 review: screenshots 1280/390 (Oct 19) | Reviewed against the shared system; no per-screen change needed |
| 60 | Authors | `/admin/authors` | — | done | P3 review: screenshots 1280/390 (Oct 19) | Reviewed against the shared system; no per-screen change needed |
| 61 | Edition IDs | `/admin/editions` | — | done | P3 review: screenshots 1280/390 (Oct 19) | Reviewed against the shared system; no per-screen change needed |
| 62 | Moderation | `/admin/moderation` | — | done | P3 review: screenshots 1280/390 (Oct 19) | Reviewed against the shared system; no per-screen change needed |
| 63 | Orders | `/admin/orders` | — | done | P3 review: screenshots 1280/390 (Oct 19); changed and re-checked | Price and status aligned on phones |
| 64 | Finance | `/admin/finance` | — | done | P3 review: screenshots 1280/390 (Oct 19); changed and re-checked | Fixed: month boundaries used the server's UTC time (wrong month label, 31-day months missed their last day) |
| 65 | Payouts | `/admin/payouts` | — | done | P3 review: screenshots 1280/390 (Oct 19); changed and re-checked | Balance aligned on phones; total in even-width digits |
| 66 | Subscriptions | `/admin/subscriptions` | — | done | P3 review: screenshots 1280/390 (Oct 19) | Reviewed against the shared system; no per-screen change needed |
| 67 | Plans | `/admin/plans` | — | done | P3 review: screenshots 1280/390 (Oct 19) | Reviewed against the shared system; no per-screen change needed |
| 68 | Services | `/admin/services` | — | done | P3 review: screenshots 1280/390 (Oct 19) | Reviewed against the shared system; no per-screen change needed |
| 69 | Service order | `/admin/services/orders/{id}` | — | done | P3 review: screenshots 1280/390 (Oct 19) | Reviewed against the shared system; no per-screen change needed |
| 70 | Printers | `/admin/printers` | — | done | P3 review: screenshots 1280/390 (Oct 19) | Reviewed against the shared system; no per-screen change needed |
| 71 | New printer | `/admin/printers/new` | — | done | P3 review: screenshots 1280/390 (Oct 19) | Reviewed against the shared system; no per-screen change needed |
| 72 | Edit printer | `/admin/printers/{id}` | — | done | P3 review: screenshots 1280/390 (Oct 19) | Reviewed against the shared system; no per-screen change needed |
| 73 | Shipping | `/admin/shipping` | — | done | P3 review: screenshots 1280/390 (Oct 19) | Reviewed against the shared system; no per-screen change needed |
| 74 | Settings | `/admin/settings` | — | done | P3 review: screenshots 1280/390 (Oct 19); changed and re-checked | Save bar: message and button on one line, no blur |
| 75 | Issues | `/admin/issues` | — | done | P3 review: screenshots 1280/390 (Oct 19) | Reviewed against the shared system; no per-screen change needed |
| | **Printer** | | | | | |
| 76 | Print jobs | `/printer` | — | done | P3 review: screenshots 1280/390 (Oct 19) | Reviewed against the shared system; no per-screen change needed |
| 77 | Print order | `/printer/orders/{id}` | — | done | P3 review: screenshots 1280/390 with an assigned order (Oct 19), no overflow | Reviewed against the shared system; no per-screen change needed |
| | **System screens** | | | | | |
| 78 | Page not found | `(any missing page)` | — | done | typecheck + lint | 404 with search |
| 79 | Something went wrong | `(error)` | — | done | typecheck + lint | Error sheet with reference |
| 80 | Offline | `(installed app, no connection)` | — | done | typecheck + lint | Offline page; service worker cache bumped to v2 |

## Resume here

P3 (Oct 19): every screen from 29 to 77 was screenshotted at 1280 and 390 and reviewed. Changed screens are noted in the table;
the rest needed no per-screen change. Shared additions: an iOS-style `switch` utility (real checkbox, `role="switch"`) and
grouped-list settings sections (small section label above a `group-list`). The Distribution screens (Author → Distribution,
Admin → Distribution) were built on the same system in PR #23.

Known, not changed here: the author dashboard's city chart counts from midnight UTC rather than midnight India time
(`src/lib/author-stats.ts`), which affects only the first few hours of its 12-month window.


Design pack (COMPLETE-DESIGN-BRIEF.md): homepage, book page, shelves and copy were done individually. Public screens 5–24 (except 3) were not individually revisited in that pass; they use the shared typography, colours and components.
