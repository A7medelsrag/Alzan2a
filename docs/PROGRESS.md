# Progress

## 2026-11-13 — Fix local image URLs for category uploads

- Diagnosed broken uploaded images in the local HTTP development app: saved media URLs use `https://localhost:4000`, but no TLS server is configured there. Added a frontend resolver that serves local API media through the same-origin `/api/v1/media` proxy during HTTP development.
- Applied the resolver to homepage category imagery, admin category thumbnails, upload previews, and banner images.
- Verified the live homepage API returns 2 categories with images and the first image loads through the web proxy with HTTP 200. Web typecheck, ESLint, and production build passed; the build retains the existing large-chunk warning.

## 2026-11-13 — Display uploaded category images on homepage

- Confirmed category image uploads are saved by the admin category/content APIs and included in homepage category responses, then fixed the storefront category card that previously ignored the returned `imageUrl` and always showed a decorative background.
- Category cards now display the saved image, retaining the gradient placeholder when a category has no image or the image fails to load.
- Verification: web typecheck, ESLint on `Storefront.tsx`, and web production build passed. Existing large-chunk warning remains. Browser rendering was not manually checked.

## 2026-11-13 — Restore API database connectivity

- Diagnosed admin login HTTP 500: Prisma Client had been generated with `--no-engine`, so direct database queries failed with Prisma `P6001`.
- Regenerated Prisma Client with its normal query engine and restarted the API. Configured the local API Redis URL in `apps/api/.env`.
- Verification: API `/health/ready` returns `ready`; an admin login probe with deliberately invalid credentials returns 401, confirming the API reaches the expected credential check without signing in. The API remains running on port 4000. No valid login was attempted.

## 2026-11-13 — Split homepage campaigns into five placements

- Added the five requested named ad slots to admin design controls: main hero, upper side, lower side, timer, and final banner. Kept announcement and legacy promotion slots available for compatibility.
- Connected each new slot to its storefront placement; side ads stack beside the main hero, timer ad appears in the countdown section, and final ad appears after homepage sections.
- Added a database migration that expands the enum and reclassifies the first three existing promotions by display order into upper side, lower side, and timer, preserving any remaining promotions.
- Verification: shared/API/web typechecks, web production build, ESLint on changed storefront/admin/i18n files, and `git diff --check` passed. Build reports the existing large chunk warning. Migration was not applied and banner rendering was not manually checked in a browser.

## 2026-11-13 — Upload category images from category forms

- Added local image selection, upload progress/errors, URL entry, and preview to both the create-category modal and edit-category panel using the existing shared admin image field. The uploaded URL is saved through the existing category create/update API.
- Retrieved the active admin session CSRF token for uploads; server-side image validation and re-encoding remain in effect.
- Verification: storefront typecheck, production build, and ESLint on changed files passed. Build shows the existing non-blocking large chunk warning. No manual browser upload smoke test was run.

## 2026-11-13 — Connect all homepage ad placements to admin content

- Confirmed the homepage admin supports create/edit/delete, desktop and mobile image upload, copy, destination, display order, enable/disable, and start/end scheduling for announcement, hero, and promotion banners.
- Replaced the hardcoded storefront announcement bar with the enabled announcement banner configured in admin, including its destination link. It is hidden when no enabled, scheduled announcement has text.
- Promotion cards now render desktop images on desktop and the configured mobile image on mobile. Hero banner actions now follow the configured button label and destination without an extra hardcoded secondary action.
- Verification: web typecheck, production build, and ESLint on `Storefront.tsx` passed. Build retains the existing non-blocking large chunk warning. Admin/banner management and live rendering were not manually exercised in a browser.

## 2026-11-13 — Upload product images from product form

- Replaced the product form's URL-only image input with the shared admin image field, which supports selecting a local PNG/JPG/WebP file, upload progress, error feedback, URL entry, and preview. The uploaded URL is saved through the existing create/update product API.
- Retrieved the current admin session CSRF token for authenticated upload requests; retained the existing 5 MB client limit and server-side image validation/re-encoding.
- Verification: `pnpm --filter @store/web typecheck`, `pnpm --filter @store/web build`, and ESLint on both changed TypeScript files passed. Build shows the existing non-blocking large chunk warning. No manual browser upload smoke test was run.

## 2026-11-12 — Add-to-cart actions on product cards

- Added an add-to-cart button to catalog product cards and the related-products cards on product detail pages. Buttons add the first in-stock variant to the existing cart and are disabled when no variant is available.
- Added localized Arabic button labels and ensured the card button meets the 44px minimum touch target.
- Verification: storefront typecheck and production build passed; ESLint passed for changed TypeScript files; cart context tests passed (5 tests). The build retains the existing non-blocking large-chunk warning.
- Not verified visually in a browser at responsive breakpoints.

## 2026-11-11 — Admin sign-in security and language correction

- Confirmed the admin login accepts an email address as the username; the account record must have that exact email stored in its username field. The login UI now labels this clearly and includes the MFA/recovery code required by accounts configured with MFA.
- Removed the hardcoded default-admin provisioning command and script. The former default credential was exposed in repository history; treat it as compromised and rotate or disable that account through the database/operator before production use. The interactive first-Owner bootstrap remains.
- Corrected the account-choice labels and replaced the mojibake admin login copy with readable Arabic.
- Read-only database verification found active Owner `admin1@gmail.com`; its stored password hash matches the former hardcoded default, and MFA is disabled. The actual credential value is intentionally omitted here. This password is compromised and should be rotated before production use. Live HTTP login and browser rendering remain unverified.
- Admin login runtime diagnosis: PostgreSQL and API are reachable, but no Redis server is listening on `localhost:6379`; `store/apps/api/.env` also lacked the Redis URL present in the workspace `.env`. Updated API config loading to read both app and workspace `.env` files, with app-specific values taking precedence. Verified the API now resolves the workspace Redis URL and passed API typecheck.
- Started Memurai as the local Redis-compatible Windows service on `localhost:6379`, then restarted the API. Verified `/health/live` and `/health/ready` return 200; an invalid admin credential probe now reaches authentication and returns 401 rather than service unavailable; the web proxy reaches the admin session endpoint (401 unauthenticated, as expected before sign-in). The API and web dev processes are running.
- Still pending: confirm an interactive admin sign-in in the browser. Do not use the compromised legacy password outside local development; rotate it before production.

## 2026-11-11 — About page

- Reworked the Arabic RTL About page to follow the provided layout: hero, store story, value cards, category cards, and a shopping call to action. Reused the storefront color and font tokens, added responsive styles, localized the copy, and set the About page title.
- Verification: passed `pnpm --dir store --filter @store/web build` and ESLint for the changed TypeScript files. The Vite About page module returned HTTP 200 with the expected content.
- Not verified visually at 360/390/768/1280 widths: the browser tool client was unavailable in this session. The normal dev command also encountered an out-of-memory error during its shared-package predev step; direct Vite startup worked for the HTTP check.

## 2026-11-11 — Full Admin Dashboard Integration with Live API and Database

- Backend API Expansion:
  - Created `AdminManagementService` (`apps/api/src/services/admin-management.service.ts`) with atomic PostgreSQL / Prisma queries for:
    - Overview KPIs: total/today orders, today/total sales, total customers, total products, low stock items, pending reviews, and recent orders.
    - Product Management: listing with filters, creation with automatic slug sanitization, update, delete, and variant stock level adjustments.
    - Category Management: list with live product counts, create, update, and safe delete (preventing deletion of categories with attached products).
    - Customer CRM: live list of registered and guest customers with order counts and lifetime spend calculations.
    - Review Moderation: review list with status filtering, and approval / rejection workflow.
  - Added Fastify route handlers under `/api/v1/admin` in `apps/api/src/routes/admin-management.routes.ts` with origin security, authentication, and RBAC permissions (`manageCatalog`, `manageCustomers`, `manageReviews`).
  - Added permissions to `@store/shared/src/permissions.ts`.
- Frontend API Client:
  - Implemented typed client layer in `apps/web/src/features/admin/api/management.ts`.
- Frontend Dashboard Screens Connected:
  - `AdminOverview.tsx`: Connected to `fetchAdminOverview()`, showing live system status, real sales numbers in EGP, real order counts, and recent orders table.
  - `AdminProducts.tsx`: Connected to `fetchAdminProducts()` and `fetchAdminCategories()`, with search, category filtering, tab filtering, bulk publishing/drafting/deleting, and single item deletion.
  - `AdminProductCreate.tsx`: Connected to `createAdminProduct()`, `updateAdminProduct()`, dynamic category select, image URL preview, and price/stock handling.
  - `AdminCategories.tsx`: Connected to `fetchAdminCategories()`, `createAdminCategory()`, `updateAdminCategory()`, and `deleteAdminCategory()`.
  - `AdminInventory.tsx`: Connected to real variant inventory with quick stock adjustment modal via `updateAdminVariantStock()`.
  - `AdminCustomers.tsx`: Connected to `fetchAdminCustomers()`, displaying customer spending, order history, and contact details.
  - `AdminReviews.tsx`: Connected to `fetchAdminReviews()` with live approve/reject buttons via `updateAdminReviewStatus()`.
- Verification:
  - Passed: `pnpm typecheck` across all monorepo packages (`@store/ui`, `@store/shared`, `@store/api`, `@store/web`).
  - Passed: `pnpm test` (176 tests passing across 40 test files).
  - Passed: `pnpm build` (clean production builds).

## 2026-11-11 — Shipping and Returns Policy Page

- Reworked the storefront policy page to match the supplied design: gradient title banner, breadcrumb, section index, delivery-rate table, and separate policy cards.
- Added responsive layout and keyboard-accessible horizontal scrolling for the shipping-rate table.
- Verification:
  - Passed: `pnpm --filter @store/web build` (TypeScript check and Vite production build).
  - Passed: `pnpm exec eslint apps/web/src/pages/ReturnsPolicyPage.tsx`.
  - Passed: local storefront returned HTTP 200 for `/returns`.
  - Not verified: browser screenshot/responsive visual review because the integrated browser client was not connected.

## 2026-11-11 — Storefront category page

- Updated category selection to open a dedicated category layout with a breadcrumb, category banner, category navigation, filter sidebar, product sorting, and product cards.
- Exposed the existing category parent relationship in catalog and homepage responses, and made parent-category requests include products assigned to their direct subcategories.
- Added working price, size, availability, discount, and free-shipping filters based on catalog and offer data; category pages load six products initially and support loading more.
- Added a mobile filter sheet and translated the new category-page copy through the Arabic storefront resources.
- Verification:
  - Passed: `pnpm.cmd --dir store typecheck` (all workspace packages).
  - Passed: `pnpm.cmd --dir store lint`.
  - Passed: `pnpm.cmd --dir store build` (all workspace packages and apps).
  - Passed: `pnpm.cmd --dir store test` (176 passed, 1 skipped across 40 files).
  - Not verified: browser screenshot/responsive visual review because no browser client was connected.
  - Build note: Vite reports a non-blocking warning for a generated JavaScript chunk larger than 500 kB.

  ## 2026-11-11 — Storefront Offers Page

  - Added the `/offers` storefront route with a responsive promotional hero, live product-offer cards, bundle cards, discounted products, and free-shipping products.
  - Reused the storefront header, footer, product cards, offer/bundle APIs, and bundle detail modal; added Arabic UI strings and route title.
  - Coupon listing and flash-deal sold percentages remain unavailable because the public API does not expose those data.
  - Verification:
    - Passed: `pnpm --filter @store/web build` (TypeScript check and Vite production build).
    - Passed: `pnpm exec eslint apps/web/src/App.tsx apps/web/src/Storefront.tsx apps/web/src/i18n.ts`.
    - Passed: `pnpm test` (176 tests passed across 40 files; 1 skipped).
    - Passed: local storefront returned HTTP 200 for `/offers`.
    - Not verified: browser screenshot/responsive visual review because the integrated browser client was not connected.
    - Note: Prettier `--check` reported style differences in the touched files; no broad formatting was applied.

## 2026-11-11 — Dashboard operations backends and page connection

- Implemented APIs and connected purchases/suppliers, finance/expenses/courier settlements, governorate shipping, store settings/audit history, and staff/MFA management. Writes are Origin/CSRF protected, permission checked, and audited. Purchase confirmation updates inventory and weighted-average costs; supplier overpayments and invalid settlements are rejected. Staff reset/role/activation changes revoke all indexed Redis sessions.
- Checkout now loads enabled shipping prices from the database and the server recomputes rates using the same table and current store settings. Orders snapshot product costs and create initial events/stock movement rows. Admin status changes now follow the complete state machine, restock idempotently, set delivered/returned timestamps, and create events.
- Applied migration `20261111140556_admin_dashboard_backends` after a successful isolated backup/restore and migration rehearsal. No existing demo/product/account/order data was removed; test suite uses mocks and did not insert development records. The migration adds editable shipping defaults and the global settings record.
- Verification: API/web typecheck and builds passed; focused lint passed; full suite passed (187 passed, 1 skipped). Admin operations authorization tests cover read-only Manager settings and Owner-only staff access. Migration rehearsal passed on retained isolated databases; both migrations deployed and `migrate status` is clean on `zan2a_dev`. Live smoke checks returned HTTP 200 for API readiness, the storefront shipping-rate endpoint (27 enabled rates), and `/admin/purchases` and `/admin/finance` routes.
- Test suite uses mocks and wrote no development test rows; no test/demo records were removed in this task. Existing data was preserved; the migration only added schema/default config and backfilled missing delivery/return timestamps from the existing order update timestamps. Browser login and write workflows were not manually exercised because that requires an interactive staff MFA session. The connected purchase form supports multiple distinct variant lines. Receipt image URLs and monthly recurring expense settings are available in the finance form. Vite reports the existing non-blocking large chunk warning.





## 2026-11-11 - Admin dashboard integration review and demo cleanup

- Routed orders, coupons, offers/bundles, homepage content, and product/order detail screens to their existing live APIs. Replaced static order detail with API-loaded order data and server updates. Removed mock order/ads files and replaced the marketing page with links to the connected promotion tools.
- Removed hard-coded dashboard chart and traffic/device percentages, fake sidebar counts/notifications, and fabricated financial, supplier, shipping, staff, and settings records. The unsupported screens now say plainly that no backend API is connected.
- Corrected dashboard aggregate sales to delivered orders; the "today" delivery window uses updatedAt because there is no deliveredAt column. Average order value uses delivered-order counts.
- Added CSRF validation to admin catalog mutations, archived products instead of hard-deleting them, required stock-adjustment reasons, and wrote stock changes to AuditLog. Admin header/logout now use the server session and CSRF token.
- Verification: web and API typecheck passed; full test suite passed (184 tests, 1 skipped); focused admin management CSRF/archive and client CSRF tests passed (4 tests). The API/web tests use mocks and do not insert test rows in the development database.
- Removed only identified seed demo rows in one transaction: 3 unused coupons, 2 reviews linked to `.demo` seed customers, 1 seed offer, and 1 seed bundle. Post-cleanup counts: coupons 0, reviews 0, offers 0, bundles 0. Preserved 8 products, 6 categories, 2 customer accounts, 2 admin accounts, and all orders (0). The demo customer accounts remain because account deletion is prohibited. No migration was applied.
- Remaining backend work requires an approved schema/workflow decision for supplier purchases, finance/expenses/COD settlement, shipping rates, staff management, and settings.

## 2026-11-12 — Dashboard content images and layout polish

- Removed the placeholder question-mark card from the admin overview.
- Wrapped homepage content and ad management in the shared admin layout so the sidebar and dashboard header remain present, including while data loads. Consolidated section creation into the shared header action and kept logout in the common sidebar.
- Added local image selection and preview alongside URL entry for homepage sections, desktop/mobile banners, category images/banners, and product images. Uploads use the existing authenticated admin media endpoint with the session CSRF token; the API validates and re-encodes images. The returned URL is saved through the existing content APIs.
- Improved disabled action button text contrast and added clear keyboard focus for image upload controls.
- Verification: web typecheck passed; web production build passed (existing large-chunk warning); focused admin/homepage API tests passed (4 tests); ESLint passed on the changed TypeScript files. No manual browser image-upload smoke test was run.

## 2026-11-12 — Align dashboard form labels beside fields

- Aligned dashboard form labels on the right beside their input boxes, including image URL fields. Kept the same side-by-side layout on mobile with narrower label columns.
- Verification: web typecheck and focused ESLint passed.
