# Store API

The shared Zod schemas in `packages/shared/src/schemas.ts` define request and response validation. All routes are under `/api/v1`.

## Public homepage

### `GET /store/homepage`

Returns currently enabled homepage banners and sections in their configured order. Records outside their `startsAt`/`endsAt` window are omitted. An empty `CATEGORIES` section uses the live category catalog; an uncurated `NEW_ARRIVALS` section uses the newest active products.

```json
{
  "data": {
    "banners": [
      {
        "id": "uuid",
        "slot": "HERO",
        "title": "string or null",
        "subtitle": "string or null",
        "desktopImageUrl": "https://... or null",
        "mobileImageUrl": "https://... or null",
        "buttonLabel": "string or null",
        "linkUrl": "/path or https://... or null",
        "overlayColor": "#0A1733",
        "overlayOpacity": 35,
        "blur": 0
      }
    ],
    "sections": [
      {
        "id": "uuid",
        "type": "CATEGORIES",
        "title": "string",
        "subtitle": "string or null",
        "description": "string or null",
        "imageUrl": "https://... or null",
        "buttonLabel": "string or null",
        "linkUrl": "/path or https://... or null",
        "products": [],
        "categories": []
      }
    ]
  }
}
```

Banner slots are `ANNOUNCEMENT`, `HERO`, and `PROMOTION`. Section types are `CATEGORIES`, `NEW_ARRIVALS`, `BEST_SELLERS`, `FEATURED_COLLECTIONS`, `SEASONAL_OFFERS`, `BRAND_STORY`, `RECENTLY_VIEWED`, `BENEFITS`, `NEWSLETTER`, and `SOCIAL`. Recently viewed is not rendered until the storefront supports product-detail view tracking.

## Admin homepage management

Routes use the existing `__Host-admin_session` cookie. Every request requires a server-verified Owner or Manager session. State-changing requests additionally require an allowed `Origin` and the session `X-CSRF-Token`. Mutations are written to `AuditLog`.

### `GET /admin/homepage`

Returns editable sections, banners, active product choices, and categories. Response is `Cache-Control: no-store`.

### Sections

- `POST /admin/homepage/sections` — create a section.
- `PUT /admin/homepage/sections/{id}` — replace a section's editable fields.
- `DELETE /admin/homepage/sections/{id}` — delete a section.
- `PUT /admin/homepage/sections/order` — reorder all configured section IDs: `{ "ids": ["uuid", "..."] }`.

Section bodies use `homepageSectionInputSchema`: `type`, `title`, optional `subtitle`, `description`, `imageUrl`, `buttonLabel`, `linkUrl`, `startsAt`, and `endsAt`, plus `isEnabled`, `sortOrder`, `productIds`, and `categoryIds`. Image URLs must be HTTPS. `linkUrl` must be a same-origin path or HTTPS URL. Scheduling values are ISO timestamps; the admin UI converts local date/time input to UTC.

### Banners

- `POST /admin/homepage/banners` — create a banner.
- `PUT /admin/homepage/banners/{id}` — replace a banner's editable fields.
- `DELETE /admin/homepage/banners/{id}` — delete a banner.

Banner bodies use `homepageBannerInputSchema`: `slot`, optional `title`, `subtitle`, `desktopImageUrl`, `mobileImageUrl`, `buttonLabel`, `linkUrl`, `startsAt`, and `endsAt`, plus `overlayColor`, `overlayOpacity` (0–80), `blur` (0–20), `isEnabled`, and `sortOrder`. A banner needs text or an image. A button label requires a destination.

### Catalog media

- `PUT /admin/homepage/products/{id}/image` — `{ "imageUrl": "https://..." }` (or `null`).
- `PUT /admin/homepage/categories/{id}/images` — `{ "imageUrl": "https://..." | null, "bannerImageUrl": "https://..." | null }`.

### Media upload

- `POST /admin/media/upload` — authenticated `multipart/form-data` upload with exactly one raster image in the `file` field.

The route requires an Owner or Manager session with `manageHomepage`, an allowed `Origin`, and the session `X-CSRF-Token`. Upload attempts are limited to 10 authorized requests per authenticated staff account per 10 minutes by an atomic counter in the API's shared Redis client. The staff identity comes from the verified session. The fixed window starts on the first allowed request; denied requests do not extend it. Authenticated requests with invalid files also consume an attempt. `429 RATE_LIMITED` includes `Retry-After`. Redis failure or an unavailable shared limiter fails closed with `503 UPLOAD_RATE_LIMIT_UNAVAILABLE`; there is no local fallback. This staff quota is separate from the general API IP limiter.

The API accepts JPEG, PNG, and WebP input, validates the actual image signature and decoder output, then returns only a re-encoded WebP object.

Successful responses use `{ "data": { "url": "https://...", "key": "homepage-banners/<generated-id>.webp", "width": 1200, "height": 800, "format": "webp", "size": 123456 } }`. `url` is the permanent HTTPS URL under `MEDIA_PUBLIC_ASSET_BASE_URL`, not a private storage endpoint, and can be saved unchanged in existing banner image URL fields; media metadata and image bytes are not stored in PostgreSQL.

See `MEDIA_STORAGE.md` for limits, processing rules, configuration, local development, production object/CDN access policy, and the opt-in provider integration test. Errors include `ADMIN_UNAUTHENTICATED`, `ADMIN_FORBIDDEN`, `ORIGIN_NOT_ALLOWED`, `CSRF_VALIDATION_FAILED`, `RATE_LIMITED`, `UPLOAD_RATE_LIMIT_UNAVAILABLE`, `MEDIA_MULTIPART_REQUIRED`, `MEDIA_MULTIPART_INVALID`, `MEDIA_FILE_MISSING`, `MEDIA_MULTIPLE_FILES`, `MEDIA_FILE_TOO_LARGE`, `MEDIA_INVALID_FILE`, `MEDIA_IMAGE_INVALID`, `MEDIA_IMAGE_DIMENSIONS_INVALID`, `MEDIA_STORAGE_UNAVAILABLE`, and `MEDIA_AUDIT_FAILED`.

All other image URL inputs remain HTTPS-only. Unknown JSON request fields are rejected. Schedule validation, role checks, Origin/CSRF checks, and product/category reference validation are server-side.

### Errors

Responses use `{ "error": { "code": "..." } }`. Common homepage errors include `VALIDATION_ERROR`, `ADMIN_UNAUTHENTICATED`, `ADMIN_FORBIDDEN`, `CSRF_VALIDATION_FAILED`, `ORIGIN_NOT_ALLOWED`, `HOMEPAGE_SECTION_NOT_FOUND`, `HOMEPAGE_BANNER_NOT_FOUND`, `HOMEPAGE_REFERENCE_NOT_FOUND`, and `HOMEPAGE_SETUP_REQUIRED` (the homepage migration is not applied).


## Customer Authentication API

All customer routes use `/api/v1/store/customer/*` and `/api/v1/store/auth/*`. Sessions use the `__Host-customer_session` HttpOnly cookie.

### `POST /api/v1/store/auth/google`

Authenticates or registers a customer via Google Identity Services.

- **Request Body:** `{ "credential": "<Google-ID-Token>" }`
- **Validation:** Server verifies token signature against Google JWKS, verifies audience against `GOOGLE_CLIENT_ID`, and asserts `email_verified: true`.
- **Response:** `{ "data": { "customer": { "id": "uuid", "fullName": "string", "email": "string", "phone": "string or null" } } }`
- **Session:** Sets `__Host-customer_session` HttpOnly Secure Lax cookie and returns CSRF token.

### `POST /api/v1/store/customer/register`

Registers a new customer via phone and password.

- **Request Body:** `{ "fullName": "string", "phone": "+201...", "password": "...", "confirmPassword": "..." }`
- **Password policy:** 15-character minimum, common password blocklist.

### `POST /api/v1/store/customer/login`

Authenticates an existing phone+password customer.

- **Request Body:** `{ "phone": "+201...", "password": "..." }`

## Orders & Checkout API

All orders use Cash On Delivery (COD).

### `POST /api/v1/store/orders`

Creates a new order. Open to both authenticated customers and guests.

- **Headers:** `Idempotency-Key` (UUID, required).
- **Request Body:**
  ```json
  {
    "customer": {
      "fullName": "Ahmed Mohamed",
      "phone": "+201012345678",
      "backupPhone": "+201112345678",
      "email": "customer@example.com"
    },
    "shippingAddress": {
      "governorate": "Cairo",
      "cityArea": "Nasr City",
      "detailedAddress": "Street 10, Building 4, Apt 2",
      "landmark": "Near Al-Ahly Club"
    },
    "items": [
      {
        "variantId": "uuid",
        "quantity": 1
      }
    ]
  }
  ```
- **Integrity:** Prices, discounts, shipping fees, and inventory availability are completely recomputed server-side inside a database transaction.
- **Stock:** Decremented atomically (`WHERE stock >= qty`).
- **Response:**
  - For logged-in customers: Order linked to `customerId`.
  - For guests: `customerId` is null. Sets a short-lived HMAC-signed receipt token in `__Host-guest_receipt` cookie for authorized confirmation viewing.

### `GET /api/v1/store/orders`

Retrieves past orders with real-time tracking status. **Strictly restricted to authenticated account holders.**

### `GET /api/v1/store/orders/:id`

Retrieves a single order confirmation/summary:
- Allowed if session belongs to the order's `customerId`.
- Allowed for guests only if a valid matching `__Host-guest_receipt` cookie is presented.
- All other requests are denied with `404 ORDER_NOT_FOUND` to prevent IDOR / enumeration.

## Wishlist API

### `GET /api/v1/store/wishlist`
Returns authenticated customer's saved items.

### `POST /api/v1/store/wishlist`
Adds a product (and optional variant) to wishlist. Idempotent.

### `DELETE /api/v1/store/wishlist/:id`
Removes an item from wishlist.

### `POST /api/v1/store/wishlist/sync`
Batch merges local items from guest `localStorage` into the database upon login. Idempotent; duplicate items are safely ignored.

## Admin operations

All admin routes use the admin session cookie. Mutations require an allowed `Origin` and the session CSRF token. Reads and writes are checked against the server permission matrix.

- `GET /api/v1/admin/purchases` returns active suppliers and the latest 100 invoices with lines and paid balances.
- `POST /api/v1/admin/purchases/suppliers` creates a supplier.
- `POST /api/v1/admin/purchases` creates a draft invoice; `POST /api/v1/admin/purchases/:id/confirm` atomically allocates extra costs, updates stock and weighted-average variant cost, and records stock movements.
- `POST /api/v1/admin/purchases/:id/payments` records a supplier payment and rejects overpayment.
- `GET /api/v1/admin/shipping` and `PATCH /api/v1/admin/shipping/:governorate` read/update rate, delivery window, and enablement. `GET /api/v1/store/shipping/rates` exposes enabled rates to checkout. Server checkout reads the same rate table.
- `GET /api/v1/admin/finance?from=&to=` returns delivered/returned revenue, cost snapshots, expenses (including monthly occurrences), courier fees, and delivered COD orders awaiting settlement.
- `POST /api/v1/admin/finance/expenses` records a one-time or monthly expense; ad expenses require a platform.
- `POST /api/v1/admin/finance/settlements` records a batch of delivered orders for one courier, with per-order fees and gross/net totals. Each order can be settled once.
- `GET /api/v1/admin/settings` returns store settings and the latest 100 audit entries. `PATCH /api/v1/admin/settings` is Owner-only.
- `GET /api/v1/admin/staff`, `POST /api/v1/admin/staff`, `PATCH /api/v1/admin/staff/:id`, and `POST /api/v1/admin/staff/:id/reset-mfa` are Owner-only. MFA provisioning and recovery codes are returned once on creation/reset. Staff password minimum is 15 characters.

Order status transitions follow the documented state machine. Status changes, order-time cost snapshots, and sale/cancel/return movements are written transactionally.
