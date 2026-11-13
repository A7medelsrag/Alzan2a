import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import type { PrismaClient } from "@prisma/client";
import { describe, expect, it, vi } from "vitest";
import sharp from "sharp";
import { buildServer } from "../server.js";
import type { AdminSessionStore } from "../services/admin-session.store.js";
import type { MediaStorage } from "../services/media-storage.js";
import { MediaStorageError, LocalFileMediaStorage } from "../services/media-storage.js";
import {
  StaffUploadRateLimitUnavailable,
  type StaffUploadRateLimitStore,
} from "../services/staff-upload-rate-limit.store.js";

const adminId = "11111111-1111-4111-8111-111111111111";
const csrfToken = "csrf-token-with-sufficient-length-123456";
const origin = "http://localhost:5173";
const sessionCookie = "__Host-admin_session=opaque-session";
const config = {
  environment: "test" as const,
  host: "127.0.0.1",
  port: 3000,
  databaseUrl: "postgresql://user:password@localhost:5432/catalog",
  allowedOrigins: [origin],
  logLevel: "silent" as const,
  bodyLimitBytes: 1_024,
  rateLimitMax: 100,
  rateLimitWindowMs: 60_000,
  media: {
    driver: "local" as const,
    localDirectory: ".media-test",
    publicAssetBaseUrl: "https://localhost:3000/api/v1/media",
  },
};

function createSessionStore(): AdminSessionStore {
  return {
    create: vi.fn(),
    get: vi.fn().mockResolvedValue({ adminId, csrfToken, createdAt: Date.now() }),
    revoke: vi.fn(),
    recordFailedLogin: vi.fn().mockResolvedValue(1),
    clearFailedLogins: vi.fn(),
  };
}

function createStorage(overrides: Partial<MediaStorage> = {}) {
  const objects = new Map<string, Buffer>();
  const storage: MediaStorage = {
    putObject: vi.fn(async (key, data) => {
      objects.set(key, data);
    }),
    deleteObject: vi.fn(async (key) => {
      objects.delete(key);
    }),
    publicUrl: vi.fn((key) => `https://cdn.example.com/media/${key}`),
    ...overrides,
  };
  return { storage, objects };
}

function createServer(
  role = "OWNER",
  storage?: MediaStorage,
  suppliedRateLimitStore?: StaffUploadRateLimitStore,
  withoutRateLimitStore = false,
) {
  const sessions = createSessionStore();
  const uploadRateLimitStore = suppliedRateLimitStore ?? {
    consume: vi.fn(async () => ({ allowed: true, remaining: 9, retryAfterSeconds: 600 })),
  };
  const routeRateLimitStore = withoutRateLimitStore ? undefined : uploadRateLimitStore;
  const auditCreate = vi.fn().mockResolvedValue({});
  const database = {
    adminAccount: {
      findUnique: vi.fn().mockResolvedValue({
        id: adminId,
        username: "owner",
        role,
        isActive: true,
      }),
    },
    auditLog: { create: auditCreate },
  } as unknown as PrismaClient;
  const app = buildServer(database, config, undefined, sessions, storage, routeRateLimitStore);
  return { app, auditCreate, sessions, uploadRateLimitStore };
}

function uploadRequest(
  files: Array<{ name: string; type: string; data: Buffer }>,
  withAuth = true,
) {
  const boundary = "zan2a-media-boundary";
  const pieces: Buffer[] = [];
  for (const file of files) {
    pieces.push(Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${file.name}"\r\nContent-Type: ${file.type}\r\n\r\n`,
    ));
    pieces.push(file.data);
    pieces.push(Buffer.from("\r\n"));
  }
  pieces.push(Buffer.from(`--${boundary}--\r\n`));
  return {
    method: "POST" as const,
    url: "/api/v1/admin/media/upload",
    headers: {
      origin,
      "content-type": `multipart/form-data; boundary=${boundary}`,
      ...(withAuth
        ? { cookie: sessionCookie, "x-csrf-token": csrfToken }
        : {}),
    },
    payload: Buffer.concat(pieces),
  };
}

async function createPng(): Promise<Buffer> {
  return sharp({
    create: { width: 3, height: 2, channels: 3, background: "#7A1535" },
  }).png().toBuffer();
}

describe("admin media upload route", () => {
  it("rejects unauthenticated and unauthorized staff", async () => {
    const unauthenticated = createServer();
    const anonymousResponse = await unauthenticated.app.inject(uploadRequest([
      { name: "banner.png", type: "image/png", data: await createPng() },
    ], false));
    expect(anonymousResponse.statusCode).toBe(401);
    expect(anonymousResponse.json()).toEqual({ error: { code: "ADMIN_UNAUTHENTICATED" } });
    await unauthenticated.app.close();

    const denyLimiter: StaffUploadRateLimitStore = {
      consume: vi.fn(async () => ({ allowed: true, remaining: 9, retryAfterSeconds: 600 })),
    };
    const unauthorized = createServer("SUPPORT", undefined, denyLimiter);
    const forbiddenResponse = await unauthorized.app.inject(uploadRequest([
      { name: "banner.png", type: "image/png", data: await createPng() },
    ]));
    expect(forbiddenResponse.statusCode).toBe(403);
    expect(forbiddenResponse.json()).toEqual({ error: { code: "ADMIN_FORBIDDEN" } });
    expect(denyLimiter.consume).not.toHaveBeenCalled();
    await unauthorized.app.close();
  });

  it("requires CSRF and rejects requests from unapproved origins", async () => {
    const { app } = createServer();
    const noCsrf = uploadRequest([{ name: "banner.png", type: "image/png", data: await createPng() }]);
    delete (noCsrf.headers as Record<string, string>)["x-csrf-token"];
    const csrfResponse = await app.inject(noCsrf);
    expect(csrfResponse.statusCode).toBe(403);
    expect(csrfResponse.json()).toEqual({ error: { code: "CSRF_VALIDATION_FAILED" } });

    const badOrigin = uploadRequest([{ name: "banner.png", type: "image/png", data: await createPng() }]);
    badOrigin.headers.origin = "https://untrusted.example";
    const originResponse = await app.inject(badOrigin);
    expect(originResponse.statusCode).toBe(403);
    expect(originResponse.json()).toEqual({ error: { code: "ORIGIN_NOT_ALLOWED" } });
    await app.close();
  });

  it("stores only processed images and ignores the supplied filename", async () => {
    const { storage, objects } = createStorage();
    const { app, auditCreate, uploadRateLimitStore } = createServer("OWNER", storage);
    const response = await app.inject(uploadRequest([
      { name: "../../private.svg", type: "image/png", data: await createPng() },
    ]));
    const result = response.json().data as {
      url: string;
      key: string;
      width: number;
      height: number;
      format: string;
      size: number;
    };

    expect(response.statusCode).toBe(201);
    expect(result).toMatchObject({
      url: expect.stringMatching(/^https:\/\/cdn\.example\.com\/media\//),
      key: expect.stringMatching(/^homepage-banners\/[0-9a-f-]+\.webp$/i),
      width: 3,
      height: 2,
      format: "webp",
    });
    expect(result.key).not.toContain("private");
    expect(result.size).toBe(objects.get(result.key)?.length);
    expect(uploadRateLimitStore.consume).toHaveBeenCalledWith(adminId);
    expect(auditCreate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        actorId: adminId,
        action: "MEDIA_UPLOAD",
        entity: "MediaObject",
        entityId: result.key,
      }),
    }));
    await app.close();
  });

  it("rejects missing, multiple, malformed, and MIME-spoofed files", async () => {
    const { app } = createServer();
    const missing = await app.inject(uploadRequest([]));
    expect(missing.statusCode).toBe(400);
    expect(missing.json()).toEqual({ error: { code: "MEDIA_FILE_MISSING" } });

    const multiple = await app.inject(uploadRequest([
      { name: "first.png", type: "image/png", data: await createPng() },
      { name: "second.png", type: "image/png", data: await createPng() },
    ]));
    expect(multiple.statusCode).toBe(400);
    expect(multiple.json()).toEqual({ error: { code: "MEDIA_MULTIPLE_FILES" } });

    const spoofed = await app.inject(uploadRequest([
      { name: "image.png", type: "image/jpeg", data: await createPng() },
    ]));
    expect(spoofed.statusCode).toBe(400);
    expect(spoofed.json()).toEqual({ error: { code: "MEDIA_INVALID_FILE" } });

    const malformed = await app.inject(uploadRequest([
      { name: "image.png", type: "image/png", data: Buffer.from("not actually a PNG") },
    ]));
    expect(malformed.statusCode).toBe(400);
    expect(malformed.json()).toEqual({ error: { code: "MEDIA_INVALID_FILE" } });
    await app.close();
  });

  it("rejects oversized uploads before image processing", async () => {
    const { app } = createServer();
    const response = await app.inject(uploadRequest([
      { name: "large.png", type: "image/png", data: Buffer.alloc(5 * 1024 * 1024 + 1) },
    ]));
    expect(response.statusCode).toBe(413);
    expect(response.json()).toEqual({ error: { code: "MEDIA_FILE_TOO_LARGE" } });
    await app.close();
  });

  it("does not expose storage errors and removes an object when audit persistence fails", async () => {
    const storageFailure = createStorage({
      putObject: vi.fn().mockRejectedValue(new MediaStorageError("write", new Error("secret access key"))),
    });
    const storageServer = createServer("OWNER", storageFailure.storage);
    const failed = await storageServer.app.inject(uploadRequest([
      { name: "banner.png", type: "image/png", data: await createPng() },
    ]));
    expect(failed.statusCode).toBe(503);
    expect(failed.body).not.toContain("secret access key");
    expect(failed.body).not.toContain("secret");
    await storageServer.app.close();

    const { storage, objects } = createStorage();
    const auditServer = createServer("OWNER", storage);
    auditServer.auditCreate.mockRejectedValue(new Error("database secret"));
    const auditFailed = await auditServer.app.inject(uploadRequest([
      { name: "banner.png", type: "image/png", data: await createPng() },
    ]));
    expect(auditFailed.statusCode).toBe(503);
    expect(auditFailed.json()).toEqual({ error: { code: "MEDIA_AUDIT_FAILED" } });
    expect(objects.size).toBe(0);
    await auditServer.app.close();
  });

  it("rate limits upload attempts", async () => {
    let count = 0;
    const uploadRateLimitStore: StaffUploadRateLimitStore = {
      consume: vi.fn(async () => {
        count += 1;
        return {
          allowed: count <= 10,
          remaining: Math.max(0, 10 - count),
          retryAfterSeconds: 600,
        };
      }),
    };
    const { app } = createServer("OWNER", undefined, uploadRateLimitStore);
    let lastResponse;
    for (let attempt = 0; attempt < 11; attempt += 1) {
      lastResponse = await app.inject({
        ...uploadRequest([]),
      });
    }
    expect(lastResponse?.statusCode).toBe(429);
    expect(lastResponse?.json()).toEqual({ error: { code: "RATE_LIMITED" } });
    expect(lastResponse?.headers["retry-after"]).toBe("600");
    expect(uploadRateLimitStore.consume).toHaveBeenCalledTimes(11);
    expect(uploadRateLimitStore.consume).toHaveBeenNthCalledWith(11, adminId);
    await app.close();
  });

  it("fails closed when the shared limiter is unavailable and skips it for unauthorized requests", async () => {
    const unavailableStore: StaffUploadRateLimitStore = {
      consume: vi.fn().mockRejectedValue(new StaffUploadRateLimitUnavailable("RedisError")),
    };
    const { app } = createServer("OWNER", undefined, unavailableStore);
    const response = await app.inject(uploadRequest([]));
    expect(response.statusCode).toBe(503);
    expect(response.json()).toEqual({ error: { code: "UPLOAD_RATE_LIMIT_UNAVAILABLE" } });
    await app.close();

    const { app: unauthorizedApp, uploadRateLimitStore } = createServer("SUPPORT");
    const unauthorized = await unauthorizedApp.inject(uploadRequest([]));
    expect(unauthorized.statusCode).toBe(403);
    expect(uploadRateLimitStore.consume).not.toHaveBeenCalled();
    await unauthorizedApp.close();

    const withoutRedis = createServer("OWNER", undefined, undefined, true);
    const noLimiter = await withoutRedis.app.inject(uploadRequest([]));
    expect(noLimiter.statusCode).toBe(503);
    expect(noLimiter.json()).toEqual({ error: { code: "UPLOAD_RATE_LIMIT_UNAVAILABLE" } });
    expect(withoutRedis.uploadRateLimitStore.consume).not.toHaveBeenCalled();
    await withoutRedis.app.close();
  });

  it("serves only generated local media keys as cacheable WebP assets", async () => {
    const directory = await mkdtemp(path.join(tmpdir(), "zan2a-media-test-"));
    const localStorage = new LocalFileMediaStorage(
      directory,
      "https://localhost:3000/api/v1/media",
    );
    const key = "homepage-banners/33333333-3333-4333-8333-333333333333.webp";
    await localStorage.putObject(key, Buffer.from("processed-webp"));
    const { app } = createServer("OWNER", localStorage);

    try {
      const found = await app.inject({
        method: "GET",
        url: `/api/v1/media/${key}`,
      });
      expect(found.statusCode).toBe(200);
      expect(found.headers["content-type"]).toBe("image/webp");
      expect(found.headers["cache-control"]).toBe("public, max-age=31536000, immutable");
      expect(found.body).toBe("processed-webp");

      const traversal = await app.inject({
        method: "GET",
        url: "/api/v1/media/../../secrets.txt",
      });
      expect(traversal.statusCode).toBe(404);
    } finally {
      await app.close();
      await rm(directory, { recursive: true, force: true });
    }
  });
});
