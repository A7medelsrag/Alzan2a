# Backend and Database Delivery Plan

## Product direction

AL zan2a | الزنقه is a full Arabic-first (RTL) e-commerce store in Egypt offering women's and girls' clothing, shoes, and household essentials.

Visitors browse categories, products, selectable variants, real-time stock availability, and promotional content. Payment is Cash On Delivery (COD) only. Visitors can checkout either as guests or with an authenticated account. Account holders gain exclusive access to order tracking and persistent wishlist synchronization.

### Confirmed boundaries

- **Full E-Commerce Scope:** Internal cart, single-page server-authoritative checkout (COD), order state machine, stock decrements, and order tracking.
- **Guest Checkout vs Account Perks:**
  - Guests can complete orders without registration.
  - Guest confirmation access is guarded strictly by short-lived signed receipt tokens (HMAC-SHA256); guest orders cannot be viewed by order ID alone.
  - Order tracking is strictly restricted to authenticated customer accounts.
  - Wishlists are saved locally for guests and persisted in PostgreSQL for account holders, with automatic idempotent merging on login.
- **Customer Identity:**
  - Phone + Password (15-character minimum, Argon2id).
  - Google OAuth (`Sign in with Google`) verifying Google ID tokens server-side via public JWKS, enforcing `email_verified === true`, and matching `aud`.
  - For Google sign-ups, phone is optional at registration but strictly mandatory at Checkout (E.164 Egypt format).
- **Financial & Operational Rules:**
  - All monetary values are integer piasters (EGP x 100), never floats.
  - Prices, discounts, shipping fees (by 27 governorates), and stock availability are always recomputed server-side in serializable transactions.
  - Inventory is decremented atomically (`WHERE stock >= qty`).
  - Admin authentication uses opaque Redis-backed sessions with `__Host-` cookies, TOTP MFA, and audit logs.
- All writes follow route -> service -> repository. Existing Prisma data is migrated forward only, never replaced in place.

## Delivery sequence

| Phase | Outcome | Database work | API work | Completion gate |
| --- | --- | --- | --- | --- |
| 0. Scope & Architecture Reconciliation | Aligned decisions and formal contracts | Update schema plan, decisions, and API spec | Documentation only | All existing 80 tests passing, lint/typecheck green |
| 1. Database & Migration Readiness | Verified backup/restore procedure and baseline schema | Rehearsal of backup/restore; apply pending migrations safely | Backup/restore script and migration verification | Rehearsal database restores and migrations apply cleanly |
| 2. Authentication & Google OAuth | Secure customer Google login and account linking | Update `Customer` (email, googleId, nullable password/phone) | `POST /api/v1/store/auth/google`, session issuance, Google token verification | Token verification, auth, session and CSRF tests |
| 3. Cart & Server-Authoritative COD Checkout | Full shopping cart & atomic checkout for guest/user | Update `Order` (guest support, snapshots, piasters) | `POST /api/v1/store/orders`, shipping calculation, atomic inventory decrement | Concurrency, idempotency, tampering and transaction tests |
| 4. Order Tracking & Guest Isolation | Stepper tracking for accounts; secure guest confirmation | Index order events & tracking fields | `GET /api/v1/store/orders`, signed receipt token verification | IDOR, authorization, and receipt token tests |
| 5. Wishlist System | Persistent wishlist for accounts with local merge | `WishlistItem` with PostgreSQL NULL-safe unique index | `GET/POST/DELETE /api/v1/store/wishlist`, sync endpoint | Idempotent sync, duplicate prevention, and auth tests |
| 6. Catalog Expansion & Domain Systems | Multi-category products, pricing rules, and inventory movements | Broad categories, variants, and stock movement tables | Public search/filters, category listing, pricing engine | Attribute filtering, pricing engine, and inventory tests |

No phase begins until the previous phase passes its completion gate.

## Database model

### Customer profile

`Customer` stores `fullName`, optional unique `email`, optional unique `googleId`, optional unique normalized `phoneE164`, an optional Argon2id `passwordHash` (null for Google users), and timestamps. `CustomerAddress` belongs to one customer and stores a label, governorate, city/area, detailed address, and optional landmark. Customer sessions and login throttling are held in Redis, not browser storage or the relational database.

Customer address APIs always scope reads and writes by the customer ID from the verified server-side session. The customer ID supplied in the URL or body is never used as identity.

### Wishlist

`WishlistItem` belongs to a customer and references a `Product` and an optional `ProductVariant`. To prevent duplicate entries when `variantId` is null in PostgreSQL, the schema enforces duplicate prevention via separate partial unique indexes (`WHERE "variantId" IS NOT NULL` and `WHERE "variantId" IS NULL`) or `NULLS NOT DISTINCT`. Wishlist synchronization on login is strictly idempotent.

### Orders and Order Items

`Order` records the transaction snapshot:
- `id`: unique UUID.
- `customerId`: optional UUID (null for guest orders).
- `status`: enum `PENDING`, `CONFIRMED`, `PROCESSING`, `SHIPPED`, `DELIVERED`, `CANCELLED`, `RETURNED`.
- Recipient snapshot: `customerName`, `customerPhone`, `customerEmail`.
- Address snapshot: `governorate`, `cityArea`, `detailedAddress`, `landmark`.
- Financial snapshot in piasters: `subtotalCents`, `shippingFeeCents`, `discountCents`, `totalCents`.
- `idempotencyKey`: unique string preventing duplicate order creation.
- Courier tracking: `courierName`, `trackingNumber`.
- `items`: line items referencing `OrderItem`.

`OrderItem` captures the snapshot of line items: `orderId`, `variantId`, `quantity`, `unitPriceCents`. Later price changes on products never alter historical order items.

### Admin identity and audit

`AdminAccount` contains `id`, unique `username`, optional unique `email`, `passwordHash` (Argon2id), role, active status, `lastLoginAt`, and timestamps. There is no public admin registration; the first Owner is created through an explicit CLI command. The initial release supports one Owner while remaining extensible to authorized staff later.

Redis holds opaque admin sessions with idle and absolute expiry, rotation after login, revocation on logout/disable, HttpOnly/Secure/SameSite cookies, CSRF and origin protection, and login rate limiting. Passwords, session IDs, and tokens are never logged. MFA is recommended before multiple-admin support is enabled.

`AuditLog` is append-only and records actor, action, target entity/ID, timestamp, and non-sensitive metadata. It covers price changes, product archive/deletion, admin changes, and setting changes.

### Product catalog

- `Category`: name, unique slug, description, optional image key, optional parent, sort order, active flag, timestamps. Categories with products cannot be deleted without handling their relationships.
- `Product`: category, name, unique slug, short/full descriptions, price and optional compare-at price in piasters, `draft`/`published`/`archived` status, availability, featured flag, sort order, optional SEO data, timestamps.
- `ProductImage`: product reference, storage key, alt text, sort order, primary flag, timestamp. PostgreSQL stores metadata only; image bytes stay in the storage provider.
- `ProductVariant` (only if required): product reference, optional unique SKU, validated JSON attributes, optional piaster price override, availability, timestamps. Its selected values are included in the WhatsApp message.

Rules: public APIs show only published products. Drafts are admin-only; archived products are not listed. Prices are never negative, and compare-at price must exceed the active price. An unavailable product may remain publicly visible but cannot be presented as available for ordering. Archive instead of physically deleting products when URLs/history must be preserved.

### Storefront content

- `StoreSettings`: one record with store name, logo key, normalized public WhatsApp number, EGP currency, optional public contact/address, social links, and update time.
- `HomepageContent`: editable hero text/image/button and section titles. Page structure stays developer-controlled.
- `HomepageBanner`: title, optional description/button/target URL, image key, active state, display order, optional schedule.
- `ContentPage` is optional and only added if the owner needs editable About, Contact, FAQ, or policy pages.

Active banners are public only inside their configured schedule. Storage credentials and internal settings are never public.

## Constraints, indexes, and data safety

- Unique: category slug, product slug, admin username, optional admin email, and optional SKU.
- Database checks: non-negative prices, valid product status, and valid ordering fields. Zod validation remains mandatory.
- Foreign keys prevent accidental destructive deletion of categories, products, and referenced images.
- Index public-product queries by status/category/creation, featured products, category ordering, and audit entries by actor/date.
- JSON variant attributes are validated against the product's configured options by shared Zod schemas.
- Do not create customer order, Shipping, Coupon, Purchase, Supplier, Inventory, Wishlist, Review, or finance tables in this release.

## API boundary

All endpoints use `/api/v1`, validate params/query/body/sensitive headers with shared Zod schemas, reject unknown input where relevant, and return errors as `{ error: { code, message?, details? } }`.

### Public read API

- `GET /api/v1/public/storefront`
- `GET /api/v1/public/categories`
- `GET /api/v1/public/products`
- `GET /api/v1/public/products/:slug`

They provide paginated/searchable/category-filtered published products, featured products, product variants and availability, active banners, and public contact/WhatsApp data.

### Admin authentication API

- `POST /api/v1/admin/auth/login`
- `POST /api/v1/admin/auth/logout`
- `GET /api/v1/admin/auth/me`
- `PATCH /api/v1/admin/auth/password`

MFA enrollment/verification is optional and must be designed before implementation.

### Customer account API

- `POST /api/v1/store/customer/register`
- `POST /api/v1/store/customer/login`
- `GET /api/v1/store/customer/me`
- `POST /api/v1/store/customer/logout`
- `PATCH /api/v1/store/customer/profile`
- `GET/POST /api/v1/store/customer/addresses`
- `PATCH/DELETE /api/v1/store/customer/addresses/:id`

Registration/login use secure HttpOnly cookies and generic invalid-credential errors. Profile/address writes require the session CSRF token. Rate limits apply to registration and login; address mutations are session-scoped. Registration may reveal a duplicate phone number and no number-verification or password-recovery flow exists.

### Protected admin API

- Products: `GET/POST /api/v1/admin/products`, `GET/PATCH/DELETE /api/v1/admin/products/:id`
- Categories: `GET/POST /api/v1/admin/categories`, `PATCH/DELETE /api/v1/admin/categories/:id`
- Media: `POST /api/v1/admin/media/upload`, optional `POST /api/v1/admin/media/confirm`, `DELETE /api/v1/admin/media/:id`
- Storefront: `GET/PATCH /api/v1/admin/storefront`, banner CRUD under `/api/v1/admin/banners`, and `GET/PATCH /api/v1/admin/settings`

Delete operations archive or safely delete according to relationships. Every administrative route requires authenticated, deny-by-default authorization.

## WhatsApp ordering

The frontend builds a Click-to-Chat URL using the public normalized WhatsApp number and URL-encoded data obtained from the public API. The message may include product name, public product URL, selected variant, quantity, displayed price, and optional SKU.

The customer may edit the message before sending. It is not an internal order, no customer data is persisted, and no order record is created. The owner confirms final availability and price in WhatsApp.

## Security requirements

- Argon2id hashes, opaque Redis sessions, secure cookies, CSRF/origin checks, login throttling, session expiry/revocation, no public admin registration, and audit logging.
- Customer identities are separate from staff identities; customer endpoints cannot read or modify staff data. Phone numbers are normalized to Egyptian E.164 and never treated as proof of ownership.
- Zod input validation, safe output serialization, mass-assignment prevention, rate limiting, restrictive CORS, security headers, and no public internal database fields.
- Image uploads validate magic bytes, allowed format, file size and dimensions; use generated storage keys; reject executable/unexpected formats; restrict media deletion; and prevent deletion of still-referenced media.

## Migration policy

Before structural changes: inspect whether the current database has real data, back it up, review existing categories/products/variants/orders, identify reusable/incompatible fields, preserve legacy order data if any, and test a forward-only migration on empty and populated copies.

Migrations are committed per bounded domain. Data transformations have explicit validation queries and recovery notes. Destructive migrations never run automatically in production. Deploy schema changes before dependent application code. Seed development data only; create the first Owner through an explicit CLI command.

## Verification and release readiness

Every phase requires typecheck, lint, unit tests, Fastify inject tests, and database tests where applicable. Test login throttling, session handling, CSRF/origin policy, unauthorized access, duplicate slugs, invalid prices, variant validation, unpublished-product exclusion, safe archive/deletion, invalid uploads, banner scheduling, public-setting exposure, WhatsApp URL encoding, and the absence of internal order creation.

Before production: complete a security review, rehearse migrations on a data copy, test backup/restore, configure production storage/domain/HTTPS/secrets, review indexes, add monitoring, define orphan-media cleanup, verify SEO/responsiveness, and run final owner acceptance testing.

## Open decisions

| Decision | Required resolution |
| --- | --- |
| Admin recovery | Secure CLI recovery or approved email-based flow |
| CAPTCHA | Off by default; introduce only for demonstrated abuse |
| Production storage | Select image storage provider |
| Domain/branding | Confirm domain, store name, logo, and contact details |
| Product variants | Confirm sizes/colors/other selectable attributes |
| Multiple admins | Confirm one Owner or additional dashboard staff |
| Content editing | Confirm which homepage and informational fields are editable |
