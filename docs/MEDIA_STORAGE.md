# Media Upload and Storage

## Architecture

`MediaService` validates and re-encodes uploads before calling the `MediaStorage` interface. `S3CompatibleMediaStorage` writes to an S3-compatible bucket using server-side credentials. `LocalFileMediaStorage` is available only outside production and stores files under the configured local directory. Routes do not contain provider-specific operations.

No Prisma media model or migration is required. Uploads return an HTTPS URL and generated object key for existing homepage banner URL fields. Successful uploads are recorded in the existing append-only `AuditLog`; if that write fails, the new object is deleted before the request fails.

## Upload contract and authorization

- Endpoint: `POST /api/v1/admin/media/upload`
- Body: `multipart/form-data`, exactly one image part named `file`
- Success: `201 { "data": { "url", "key", "width", "height", "format", "size" } }`
- Permission: server-verified Owner or Manager with `manageHomepage`
- State-changing protections: allowed `Origin` and session `X-CSRF-Token`
- Upload-specific rate limit: 10 authorized upload attempts per authenticated staff account per 10 minutes. The identity comes from the verified admin session, not request data. The fixed window begins with the first allowed attempt; denied attempts do not extend it. Authenticated requests with invalid files also consume an attempt.
- The upload quota uses the API's existing shared Redis client and an atomic Redis script, so API instances share the same counter. Redis errors or a missing limiter fail closed with `503 UPLOAD_RATE_LIMIT_UNAVAILABLE`; there is no process-local fallback. The general API IP limiter remains a separate baseline.
- Exceeded quotas return `429 RATE_LIMITED` with `Retry-After`.

The submitted filename is ignored. Uploads never accept remote URLs or caller-selected object keys.

## Validation and processing

- Accepted input formats: JPEG, PNG, WebP only; SVG, animated/multi-page images, and other formats are rejected.
- Maximum input size: 5 MiB, enforced by the multipart stream parser before image processing.
- Maximum source dimension: 8,192 pixels on either axis.
- Maximum source pixel count: 40,000,000 pixels.
- Maximum processed output size: 12 MiB.
- The detected file signature must match the submitted media type, and Sharp must successfully decode the image.
- Sharp applies EXIF orientation, emits WebP at quality 82, and does not preserve source metadata.
- Object keys are generated as `homepage-banners/<UUID>.webp`; outputs are immutable and receive `Cache-Control: public, max-age=31536000, immutable`.

These are application limits; reverse proxies should also enforce a request-body ceiling appropriate for multipart overhead.

## Public delivery and credentials

The API writes objects server-side and never returns credentials. The application does not set public ACLs, expose bucket listing, or offer a public write/delete endpoint. For production, keep the bucket private and use a CDN with origin access to serve public storefront assets. Where an S3-compatible provider requires public object reads instead, allow only `GetObject` for the media prefix; do not allow public listing or writes. Application credentials should be restricted to `PutObject` and `DeleteObject` on the media prefix (delete is used only to roll back an upload when its audit write fails).

`MEDIA_PUBLIC_ASSET_BASE_URL` is the permanent HTTPS CDN/asset prefix. It must not contain credentials, query parameters, or fragments. The API stores only references in existing content records; no binary data is written to PostgreSQL.

The generated permanent URL uses this configured asset prefix, not the S3 endpoint. Its HTTPS string is compatible with the existing homepage banner image URL fields. The application does not infer a CDN hostname or rewrite provider endpoints into CDN URLs.

## Environment configuration

Development defaults to local storage under `.media` and uses:

```dotenv
MEDIA_STORAGE_DRIVER=local
MEDIA_LOCAL_DIRECTORY=.media
MEDIA_PUBLIC_ASSET_BASE_URL=https://localhost:3000/api/v1/media
```

The local asset URL must be exposed through an HTTPS development reverse proxy. The API serves only generated `homepage-banners/*.webp` keys; it does not expose directory listing or arbitrary filesystem paths.

Production must set:

```dotenv
NODE_ENV=production
MEDIA_STORAGE_DRIVER=s3
MEDIA_PUBLIC_ASSET_BASE_URL=https://cdn.example.com/media
MEDIA_S3_REGION=us-east-1
MEDIA_S3_BUCKET=zan2a-assets
MEDIA_S3_ACCESS_KEY_ID=<server-side access key>
MEDIA_S3_SECRET_ACCESS_KEY=<server-side secret>
MEDIA_S3_FORCE_PATH_STYLE=false
```

`MEDIA_S3_ENDPOINT` is optional for AWS S3 and required when the provider uses a custom endpoint. A configured production endpoint must use HTTPS. Never place real values in `.env.example` or frontend configuration.

## Verification

### Automated and mocked tests

The normal API suite tests upload validation, storage error mapping, rollback, local storage, URL generation, Redis quota boundaries, expiry, concurrency across simulated API instances, unauthorized requests, and fail-closed Redis errors. The Redis unit tests use an atomic in-memory fake; they do not prove connectivity to a deployed Redis service. Storage error handling tests use a mocked provider failure.

### Opt-in S3/CDN integration test

`apps/api/src/services/media-storage.test.ts` contains an opt-in integration test. It is skipped unless `MEDIA_S3_INTEGRATION_ENABLED=true`. When enabled, it requires explicit credentials, a bucket name containing a `test`, `testing`, or `integration` label, `MEDIA_S3_INTEGRATION_ALLOW_TEST_BUCKET_WRITES=true`, an HTTPS S3 endpoint, and an HTTPS CDN base URL on a different origin. It uploads a uniquely keyed image, verifies its S3 content type and cache metadata, retrieves and decodes it through the configured asset URL, checks that anonymous direct reads/listing/storage writes/CDN writes are denied, and deletes only its generated test objects.

Set these variables only in a dedicated test environment:

```dotenv
MEDIA_S3_INTEGRATION_ENABLED=true
MEDIA_S3_INTEGRATION_ALLOW_TEST_BUCKET_WRITES=true
MEDIA_S3_INTEGRATION_ENDPOINT=https://s3-test.example.net
MEDIA_S3_INTEGRATION_REGION=us-east-1
MEDIA_S3_INTEGRATION_BUCKET=zan2a-assets-test
MEDIA_S3_INTEGRATION_ACCESS_KEY_ID=<test-only-access-key>
MEDIA_S3_INTEGRATION_SECRET_ACCESS_KEY=<test-only-secret>
MEDIA_S3_INTEGRATION_FORCE_PATH_STYLE=true
MEDIA_S3_INTEGRATION_CDN_BASE_URL=https://cdn-test.example.net/media
```

Run it with `pnpm --dir store --filter @store/api test -- src/services/media-storage.test.ts`. Never point this test at a production bucket or reuse production credentials. The test only deletes the two unique keys it creates.

### Manual provider and CDN checklist

When integration credentials are unavailable, provider interoperability and CDN delivery remain **unverified**. To verify in a dedicated test environment:

1. Provision an isolated bucket whose name includes `test`, `testing`, or `integration`; enable private-bucket/public-access-block settings and configure a CDN origin identity/access control for read delivery.
2. Limit application credentials to `PutObject` and `DeleteObject` on `homepage-banners/*`. Do not grant public writes or listing. Keep credentials out of frontend configuration and logs.
3. Configure the integration variables above with that bucket and its actual HTTPS CDN URL, then run the opt-in test. A pass verifies upload, object key, origin metadata, HTTPS asset URL, and delivery/caching through that configured URL for the test object.
4. Confirm in provider/CDN controls that the CDN is the only public read path, direct object access and bucket listing are denied, and public writes are denied. Review provider access logs without exposing credentials.
5. Confirm the returned URL can be saved unchanged in an existing homepage banner image URL field and loaded by the storefront. Do not use a production object for this check.
6. Remove any remaining test-only objects and revoke the test credentials when finished. If CDN headers or endpoint behavior differ from the assertions, resolve that configuration before claiming delivery verification.

The current environment has no configured `MEDIA_S3_INTEGRATION_*` credentials or test bucket, so the real-provider test and CDN delivery have not been run. A skipped integration test is not evidence of provider or CDN verification. This infrastructure change creates and applies no migration; the existing migration/backup gate remains unchanged.
