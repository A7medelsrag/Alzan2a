import { randomUUID } from "node:crypto";
import {
  DeleteObjectCommand,
  HeadObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { describe, expect, it, vi } from "vitest";
import sharp from "sharp";
import { MediaService, publicImageCacheControl } from "./media.service.js";
import { S3CompatibleMediaStorage } from "./media-storage.js";

const integrationEnabled = process.env.MEDIA_S3_INTEGRATION_ENABLED === "true";
const integrationEnvironment = {
  endpoint: process.env.MEDIA_S3_INTEGRATION_ENDPOINT,
  region: process.env.MEDIA_S3_INTEGRATION_REGION,
  bucket: process.env.MEDIA_S3_INTEGRATION_BUCKET,
  accessKeyId: process.env.MEDIA_S3_INTEGRATION_ACCESS_KEY_ID,
  secretAccessKey: process.env.MEDIA_S3_INTEGRATION_SECRET_ACCESS_KEY,
  forcePathStyle: process.env.MEDIA_S3_INTEGRATION_FORCE_PATH_STYLE,
  cdnBaseUrl: process.env.MEDIA_S3_INTEGRATION_CDN_BASE_URL,
  allowWrites: process.env.MEDIA_S3_INTEGRATION_ALLOW_TEST_BUCKET_WRITES,
};

describe("S3-compatible media storage", () => {
  it("generates a permanent HTTPS asset URL under the configured CDN prefix", () => {
    const storage = new S3CompatibleMediaStorage("test-assets", "https://cdn.example.com/media///", {
      endpoint: "https://objects.example.net",
      region: "us-east-1",
      bucket: "test-assets",
      accessKeyId: "test-access-key",
      secretAccessKey: "test-secret-key",
      forcePathStyle: true,
    });

    expect(storage.publicUrl("homepage-banners/11111111-1111-4111-8111-111111111111.webp"))
      .toBe("https://cdn.example.com/media/homepage-banners/11111111-1111-4111-8111-111111111111.webp");
    storage.close();
  });
});

describe.skipIf(!integrationEnabled)("S3-compatible media integration", () => {
  it("uploads, verifies private read-only storage, and retrieves through the configured HTTPS CDN", async () => {
    const config = readIntegrationConfig();
    const client = new S3Client({
      endpoint: config.endpoint,
      region: config.region,
      forcePathStyle: config.forcePathStyle,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
      maxAttempts: 1,
    });
    const storage = new S3CompatibleMediaStorage(config.bucket, config.cdnBaseUrl, {
      endpoint: config.endpoint,
      region: config.region,
      bucket: config.bucket,
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
      forcePathStyle: config.forcePathStyle,
    });

    let uploadedKey: string | undefined;
    const anonymousWriteProbeKey = `homepage-banners/${randomUUID()}.webp`;
    try {
      const source = await sharp({
        create: { width: 3, height: 2, channels: 3, background: "#7A1535" },
      }).png().toBuffer();
      const result = await new MediaService(storage, { recordUpload: vi.fn() })
        .upload({ data: source, contentType: "image/png" }, "integration-test-staff");
      uploadedKey = result.key;

      expect(result.key).toMatch(/^homepage-banners\/[0-9a-f-]{36}\.webp$/i);
      expect(result.url).toBe(assetUrl(config.cdnBaseUrl, result.key));
      expect(new URL(result.url).protocol).toBe("https:");
      expect(new URL(result.url).origin).not.toBe(new URL(config.endpoint).origin);
      expect(JSON.stringify(result)).not.toContain(config.accessKeyId);
      expect(JSON.stringify(result)).not.toContain(config.secretAccessKey);

      const head = await client.send(new HeadObjectCommand({ Bucket: config.bucket, Key: result.key }));
      expect(head.ContentType).toBe("image/webp");
      expect(head.CacheControl).toBe(publicImageCacheControl);

      const assetResponse = await fetch(result.url);
      expect(assetResponse.status).toBe(200);
      expect(assetResponse.headers.get("content-type")?.toLowerCase()).toContain("image/webp");
      expect(assetResponse.headers.get("cache-control")).toContain("max-age=31536000");
      expect(assetResponse.headers.get("cache-control")).toContain("immutable");
      const deliveredImage = await sharp(Buffer.from(await assetResponse.arrayBuffer())).metadata();
      expect(deliveredImage.format).toBe("webp");

      const directObjectResponse = await fetch(s3Url(config, result.key));
      expect(directObjectResponse.ok).toBe(false);
      const listingResponse = await fetch(`${s3Url(config)}?list-type=2`);
      expect(listingResponse.ok).toBe(false);

      const anonymousWriteResponse = await fetch(s3Url(config, anonymousWriteProbeKey), {
        method: "PUT",
        headers: { "content-type": "image/webp" },
        body: Buffer.from("anonymous write probe"),
      });
      expect(anonymousWriteResponse.ok).toBe(false);
      const cdnWriteResponse = await fetch(assetUrl(config.cdnBaseUrl, anonymousWriteProbeKey), {
        method: "PUT",
        headers: { "content-type": "image/webp" },
        body: Buffer.from("anonymous CDN write probe"),
      });
      expect(cdnWriteResponse.ok).toBe(false);
    } finally {
      if (uploadedKey) {
        await client.send(new DeleteObjectCommand({ Bucket: config.bucket, Key: uploadedKey }));
      }
      await client.send(new DeleteObjectCommand({
        Bucket: config.bucket,
        Key: anonymousWriteProbeKey,
      }));
      storage.close();
      client.destroy();
    }
  });
});

function readIntegrationConfig() {
  const values = integrationEnvironment;
  const required = [
    values.endpoint,
    values.region,
    values.bucket,
    values.accessKeyId,
    values.secretAccessKey,
    values.forcePathStyle,
    values.cdnBaseUrl,
  ];
  if (required.some((value) => !value)) {
    throw new Error("Enabled S3 integration test is missing required environment configuration");
  }
  if (values.allowWrites !== "true") {
    throw new Error("S3 integration test requires explicit test-bucket write authorization");
  }
  if (!/(^|[.-])(test|testing|integration)([.-]|$)/i.test(values.bucket!)) {
    throw new Error("S3 integration bucket name must clearly identify a test bucket");
  }
  if (values.forcePathStyle !== "true" && values.forcePathStyle !== "false") {
    throw new Error("S3 integration path-style setting must be true or false");
  }

  const endpoint = new URL(values.endpoint!);
  const cdnBaseUrl = new URL(values.cdnBaseUrl!);
  if (endpoint.protocol !== "https:" || cdnBaseUrl.protocol !== "https:" ||
      endpoint.username || endpoint.password || endpoint.search || endpoint.hash ||
      cdnBaseUrl.username || cdnBaseUrl.password || cdnBaseUrl.search || cdnBaseUrl.hash) {
    throw new Error("S3 integration endpoint and CDN base URL must be clean HTTPS URLs");
  }
  if (endpoint.origin === cdnBaseUrl.origin) {
    throw new Error("S3 integration CDN URL must not expose the storage endpoint");
  }

  return {
    endpoint: endpoint.toString().replace(/\/$/, ""),
    region: values.region!,
    bucket: values.bucket!,
    accessKeyId: values.accessKeyId!,
    secretAccessKey: values.secretAccessKey!,
    forcePathStyle: values.forcePathStyle === "true",
    cdnBaseUrl: cdnBaseUrl.toString().replace(/\/$/, ""),
  };
}

function assetUrl(baseUrl: string, key: string): string {
  return `${baseUrl.replace(/\/+$/, "")}/${key.split("/").map(encodeURIComponent).join("/")}`;
}

function s3Url(
  config: ReturnType<typeof readIntegrationConfig>,
  key?: string,
): string {
  const url = new URL(config.endpoint);
  const pathParts = [
    ...(config.forcePathStyle ? [config.bucket] : []),
    ...(key ? key.split("/") : []),
  ].map(encodeURIComponent);
  if (!config.forcePathStyle) url.hostname = `${config.bucket}.${url.hostname}`;
  const prefix = url.pathname.replace(/\/+$/, "");
  url.pathname = [prefix, ...pathParts].filter(Boolean).join("/");
  return url.toString();
}
