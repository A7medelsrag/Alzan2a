# Decisions

## 2026-11-04 — Product scope for the UI task

The owner selected the `catalog_whatsapp` scope in chat:

- Public storefront for browsing product catalog content.
- The storefront sells women's clothing only; shoes and household goods are excluded.
- Protected admin for catalog and storefront content management.
- Product inquiries are handed off through WhatsApp Click-to-Chat.
- Customer login and registration are optional. Browsing and WhatsApp inquiries remain available without an account.
- Customer profiles contain a name, phone number, and saved addresses. WhatsApp inquiries are not persisted as store orders, so there is no order history or tracking in the profile.
- Customer identity is normalized Egyptian mobile number plus password. Numbers are not verified; no OTP, email login, password recovery, cart, checkout, internal customer orders, shipping, inventory ledger, or finance is included.
- The storefront and admin are one React application on the same origin: `/` is the public catalog, `/login` and `/register` are optional customer account pages, `/account` is session-protected, `/admin/login` is for administrators only, and `/admin` requires a server-verified admin session.
- Admin credentials are sent to the server and are not persisted in browser storage. The UI must fail closed until the planned login and session endpoints are implemented.

This selection resolves the scope choice for the current UI task. `AGENTS (1).md` and `PROJECT_HANDOFF.md` still describe the broader COD e-commerce scope and must be reconciled before subsequent page work.

## 2026-11-05 — Optional customer accounts

The owner requested optional customer registration/login and a profile while preserving WhatsApp inquiries and guest browsing. The profile includes editable name and saved addresses; WhatsApp conversations are not stored as orders, so order history is deliberately omitted. Password recovery and phone verification remain unavailable. Until D2 is explicitly changed, registration requires a 15-character password.

## 2026-11-06 — Homepage content and image references

The homepage redesign uses persisted homepage sections and banner records. Owner and Manager roles may manage this content; all writes require the existing admin session, allowed Origin, CSRF token, and audit logging. Sections and banners support enablement, ordering, and UTC start/end scheduling.

For this task, admins provide HTTPS image URLs for banners, products, and categories; no image upload/storage service is added. Campaign text, links, and product/category selections are database-managed and are not seeded as promotional content. New Arrivals can use the newest active catalog records. Best Sellers remain manually curated because sales reporting is not yet available.

Recently Viewed is not displayed because there is no product-detail interaction to record views. Newsletter sign-up is not enabled because there is no consent or mailing-list service. Social links and editorial text can be configured as homepage sections.

## 2026-11-07 — Full E-Commerce Scope and Customer Identity Expansion (D9 & D10)

The owner officially approved expanding the product scope back to a full e-commerce store and upgrading customer authentication:

### Scope (D10)
- **Full E-Commerce Catalog:** The store offers women's and girls' clothing, shoes, and household goods (cutlery, trays, home essentials).
- **Cart & Server-Authoritative Checkout:** Internal cart and single-page checkout replacing the WhatsApp-only handoff. Payment is Cash On Delivery (COD) only.
- **Order State Machine:** Orders transition server-side (`PENDING` -> `CONFIRMED` -> `PROCESSING` -> `SHIPPED` -> `DELIVERED`, with `CANCELLED` and `RETURNED` exits).
- **Guest Checkout vs Account Perks:**
  - Guests can place orders by providing recipient information without creating an account.
  - Guest order confirmation is accessible only via a short-lived signed receipt token cookie (HMAC-SHA256); guest orders are never exposed by order ID alone.
  - **Order Tracking:** Strictly reserved for authenticated account holders inside `/account/orders`. Guests do not have access to live order tracking.
  - **Wishlist:** Guests store wishlist items in browser `localStorage`. Authenticated customers persist wishlist items in PostgreSQL with automatic, idempotent sync upon login.

### Customer Authentication & Identity (D9)
- **Google OAuth (Sign in with Google):**
  - Added as an alternate authentication method alongside normalized phone + password.
  - Server verifies Google ID tokens using Google's public JWKS keys, enforces `email_verified === true`, and validates `aud` against `GOOGLE_CLIENT_ID`.
  - Account linking policy: automatic linking of existing phone-only accounts by unverified email is prohibited to prevent account pre-hijacking.
- **Phone Number Policy:**
  - Registration via Google OAuth does not require an immediate phone number.
  - Placing an order (Checkout) strictly requires a verified-format normalized Egyptian mobile number (`+201...`) and a backup phone number.
- **Password Policy:**
  - Users registering via Google have `passwordHash = null`.
  - Later logins for Google users use the "Sign in with Google" flow. Local password/phone login is only permitted after explicitly setting a password in the user profile.

### Technical & Migration Safeguards
- **Wishlist Unique Index:** To prevent PostgreSQL NULL uniqueness pitfalls with optional variants, the schema enforces duplicate prevention via separate partial unique indexes (`WHERE "variantId" IS NOT NULL` and `WHERE "variantId" IS NULL`) or `NULLS NOT DISTINCT`.
- **Database Backup/Restore Gate:** No new migrations will be applied to the development database until the automated backup and restore rehearsal procedure is verified against a local rehearsal database.



## 2026-11-11 - Admin dashboard backend boundaries

- Existing admin APIs are the source of truth for overview, products, categories, inventory, customers, reviews, orders, coupons, offers/bundles, and homepage sections/banners. All cookie-authenticated catalog writes require the allowed Origin and CSRF token. Stock changes also require a reason and create an AuditLog record. Dashboard sales totals count delivered orders only; today uses the order update timestamp because the schema has no deliveredAt field.
- Product removal from the dashboard is archive-only; the admin product hard-delete route is removed.
- Purchases/suppliers, expenses/finance/COD settlement, configurable shipping rates, staff account management, and store settings/audit-log browsing have no approved schema/API. Keep these screens explicit about being unconnected and do not add mock values until the owner approves their data model and workflows.
- Seed-created coupons, customer reviews, product offer, and bundle are removable demo records. Preserve seeded catalog/products, categories, customer accounts, admin accounts, and all orders while the product-data and account protections remain in force.

## 2026-11-11 — Owner approval for remaining dashboard backends

The owner explicitly requested implementing the missing dashboard backends and connecting the pages, superseding the earlier hold on adding these APIs. The selected workflows follow the existing domain rules in `AGENTS (1).md`: purchase drafts have no stock effect; confirmation records received stock and weighted-average cost; supplier payments cannot exceed invoice balances; finance uses delivered/returned orders and order-time cost snapshots; monthly recurring expenses are counted once per month; courier settlement is atomic per delivered order; only the Owner manages staff; staff MFA setup/reset secrets are shown once; Managers may view but not edit settings; and all writes are CSRF-protected and audited.

Operational defaults persisted by the already approved migration are the documented governorate rates, free shipping at EGP 1,000, coupon stacking enabled to preserve existing pricing behavior, and no daily phone order cap until the Owner configures one. Enabled shipping rates are consumed by both checkout display and server-side order creation. Test suite uses mocks and did not create test rows; the existing development data was preserved.
