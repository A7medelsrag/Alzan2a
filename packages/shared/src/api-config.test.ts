import { describe, expect, it } from "vitest";
import { parseApiConfig } from "./api-config.js";

const baseEnvironment = {
  DATABASE_URL: "postgresql://user:password@localhost:5432/catalog",
};

describe("parseApiConfig", () => {
  it("requires explicit CORS origins in production", () => {
    expect(() => parseApiConfig({ ...baseEnvironment, NODE_ENV: "production" })).toThrow(
      "CORS_ALLOWED_ORIGINS is required in production",
    );
  });

  it("parses a bounded HTTP configuration", () => {
    expect(parseApiConfig({
      ...baseEnvironment,
      NODE_ENV: "production",
      CORS_ALLOWED_ORIGINS: "https://store.example.com,https://admin.example.com",
      REDIS_URL: "redis://localhost:6379",
      ADMIN_MFA_ENCRYPTION_KEY: "a".repeat(64),
      PORT: "4000",
      MEDIA_STORAGE_DRIVER: "s3",
      MEDIA_PUBLIC_ASSET_BASE_URL: "https://cdn.example.com/media",
      MEDIA_S3_REGION: "us-east-1",
      MEDIA_S3_BUCKET: "zan2a-assets",
      MEDIA_S3_ACCESS_KEY_ID: "server-access",
      MEDIA_S3_SECRET_ACCESS_KEY: "server-secret",
    })).toMatchObject({ port: 4000, allowedOrigins: ["https://store.example.com", "https://admin.example.com"] });
  });

  it("allows the local web app origins by default in development", () => {
    expect(parseApiConfig(baseEnvironment).allowedOrigins).toEqual([
      "http://localhost:5000",
      "http://127.0.0.1:5000",
    ]);
  });

  it("requires a valid MFA encryption key in production", () => {
    expect(() => parseApiConfig({
      ...baseEnvironment,
      NODE_ENV: "production",
      CORS_ALLOWED_ORIGINS: "https://admin.example.com",
      REDIS_URL: "redis://localhost:6379",
    })).toThrow("ADMIN_MFA_ENCRYPTION_KEY is required in production");

    expect(() => parseApiConfig({
      ...baseEnvironment,
      ADMIN_MFA_ENCRYPTION_KEY: "not-a-key",
    })).toThrow("ADMIN_MFA_ENCRYPTION_KEY must be a 32-byte base64 or hex key");
  });

  it("uses local storage by default for development and requires HTTPS asset URLs", () => {
    expect(parseApiConfig(baseEnvironment).media).toMatchObject({
      driver: "local",
      publicAssetBaseUrl: "https://localhost:4000/api/v1/media",
    });

    expect(() => parseApiConfig({
      ...baseEnvironment,
      MEDIA_PUBLIC_ASSET_BASE_URL: "http://assets.example.com/media",
    })).toThrow("MEDIA_PUBLIC_ASSET_BASE_URL must be an HTTPS URL");
  });

  it("requires S3 storage and complete credentials in production", () => {
    expect(() => parseApiConfig({
      ...baseEnvironment,
      NODE_ENV: "production",
      CORS_ALLOWED_ORIGINS: "https://admin.example.com",
      REDIS_URL: "redis://localhost:6379",
      ADMIN_MFA_ENCRYPTION_KEY: "a".repeat(64),
      MEDIA_PUBLIC_ASSET_BASE_URL: "https://cdn.example.com",
    })).toThrow("MEDIA_STORAGE_DRIVER must be s3 in production");

    expect(() => parseApiConfig({
      ...baseEnvironment,
      MEDIA_STORAGE_DRIVER: "s3",
      MEDIA_S3_REGION: "us-east-1",
      MEDIA_S3_BUCKET: "zan2a-assets",
      MEDIA_S3_ACCESS_KEY_ID: "server-access",
      MEDIA_S3_SECRET_ACCESS_KEY: "server-secret",
    })).toThrow("MEDIA_PUBLIC_ASSET_BASE_URL is required for S3 storage");

    expect(() => parseApiConfig({
      ...baseEnvironment,
      MEDIA_STORAGE_DRIVER: "s3",
      MEDIA_PUBLIC_ASSET_BASE_URL: "https://cdn.example.com/media",
    })).toThrow("MEDIA_S3_REGION, MEDIA_S3_BUCKET, MEDIA_S3_ACCESS_KEY_ID, and MEDIA_S3_SECRET_ACCESS_KEY are required");
  });

  it("parses a production S3 configuration without exposing credentials in the public URL", () => {
    const config = parseApiConfig({
      ...baseEnvironment,
      NODE_ENV: "production",
      CORS_ALLOWED_ORIGINS: "https://admin.example.com",
      REDIS_URL: "redis://localhost:6379",
      ADMIN_MFA_ENCRYPTION_KEY: "a".repeat(64),
      MEDIA_STORAGE_DRIVER: "s3",
      MEDIA_PUBLIC_ASSET_BASE_URL: "https://cdn.example.com/media",
      MEDIA_S3_ENDPOINT: "https://s3.example.com",
      MEDIA_S3_REGION: "us-east-1",
      MEDIA_S3_BUCKET: "zan2a-assets",
      MEDIA_S3_ACCESS_KEY_ID: "server-access",
      MEDIA_S3_SECRET_ACCESS_KEY: "server-secret",
      MEDIA_S3_FORCE_PATH_STYLE: "false",
    });

    expect(config.media).toMatchObject({
      driver: "s3",
      publicAssetBaseUrl: "https://cdn.example.com/media",
      s3: {
        endpoint: "https://s3.example.com",
        region: "us-east-1",
        bucket: "zan2a-assets",
        forcePathStyle: false,
      },
    });
    expect(config.media.publicAssetBaseUrl).not.toContain("server-secret");
  });

  it("rejects insecure S3 endpoints in production", () => {
    expect(() => parseApiConfig({
      ...baseEnvironment,
      NODE_ENV: "production",
      CORS_ALLOWED_ORIGINS: "https://admin.example.com",
      REDIS_URL: "redis://localhost:6379",
      ADMIN_MFA_ENCRYPTION_KEY: "a".repeat(64),
      MEDIA_STORAGE_DRIVER: "s3",
      MEDIA_PUBLIC_ASSET_BASE_URL: "https://cdn.example.com/media",
      MEDIA_S3_ENDPOINT: "http://s3.example.com",
      MEDIA_S3_REGION: "us-east-1",
      MEDIA_S3_BUCKET: "zan2a-assets",
      MEDIA_S3_ACCESS_KEY_ID: "server-access",
      MEDIA_S3_SECRET_ACCESS_KEY: "server-secret",
    })).toThrow("MEDIA_S3_ENDPOINT must use HTTPS in production");
  });

  it("parses TRUST_PROXY as boolean, hop count, or trusted proxy list", () => {
    expect(parseApiConfig(baseEnvironment).trustProxy).toBe(false);
    expect(parseApiConfig({ ...baseEnvironment, TRUST_PROXY: "true" }).trustProxy).toBe(true);
    expect(parseApiConfig({ ...baseEnvironment, TRUST_PROXY: "1" }).trustProxy).toBe(1);
    expect(parseApiConfig({ ...baseEnvironment, TRUST_PROXY: "loopback,10.0.0.0/8" }).trustProxy).toEqual([
      "loopback",
      "10.0.0.0/8",
    ]);
  });

  it("accepts an optional ORDER_RECEIPT_SECRET with at least 32 characters", () => {
    expect(parseApiConfig({
      ...baseEnvironment,
      ORDER_RECEIPT_SECRET: "r".repeat(32),
    }).orderReceiptSecret).toBe("r".repeat(32));

    expect(() => parseApiConfig({
      ...baseEnvironment,
      ORDER_RECEIPT_SECRET: "too-short",
    })).toThrow();
  });
});
