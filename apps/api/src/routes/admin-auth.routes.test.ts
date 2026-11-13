import type { PrismaClient } from "@prisma/client";
import { describe, expect, it, vi } from "vitest";
import { buildServer } from "../server.js";
import type { AdminSessionStore } from "../services/admin-session.store.js";

const config = {
  environment: "test" as const,
  host: "127.0.0.1",
  port: 3000,
  databaseUrl: "postgresql://user:password@localhost:5432/catalog",
  allowedOrigins: ["http://localhost:5173"],
  logLevel: "silent" as const,
  bodyLimitBytes: 1_024,
  rateLimitMax: 10,
  rateLimitWindowMs: 60_000,
  media: {
    driver: "local" as const,
    localDirectory: ".media-test",
    publicAssetBaseUrl: "https://localhost:3000/api/v1/media",
  },
};

const adminId = "11111111-1111-4111-8111-111111111111";
const csrfToken = "csrf-token-with-sufficient-length-123456";

function createSessionStore(): AdminSessionStore {
  return {
    create: vi.fn(),
    get: vi.fn().mockResolvedValue({ adminId, csrfToken, createdAt: Date.now() }),
    revoke: vi.fn(),
    recordFailedLogin: vi.fn().mockResolvedValue(1),
    clearFailedLogins: vi.fn(),
  };
}

function createServer() {
  const sessions = createSessionStore();
  const database = {
    adminAccount: {
      findUnique: vi.fn().mockResolvedValue({
        id: adminId,
        username: "owner",
        role: "OWNER",
        isActive: true,
      }),
    },
  } as unknown as PrismaClient;
  return { app: buildServer(database, config, undefined, sessions), sessions };
}

describe("admin authentication routes", () => {
  it("denies anonymous admin session checks", async () => {
    const { app } = createServer();
    const response = await app.inject({ method: "GET", url: "/api/v1/admin/auth/me" });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toEqual({ error: { code: "ADMIN_UNAUTHENTICATED" } });
    await app.close();
  });

  it("rejects state-changing admin requests without an allowed browser origin", async () => {
    const { app } = createServer();
    const response = await app.inject({
      method: "POST",
      url: "/api/v1/admin/auth/login",
      payload: { username: "owner", password: "example-password" },
    });

    expect(response.statusCode).toBe(403);
    expect(response.json()).toEqual({ error: { code: "ORIGIN_NOT_ALLOWED" } });
    await app.close();
  });

  it("requires CSRF validation before revoking an admin session", async () => {
    const { app, sessions } = createServer();
    const response = await app.inject({
      method: "POST",
      url: "/api/v1/admin/auth/logout",
      headers: {
        cookie: "__Host-admin_session=opaque-session",
        origin: "http://localhost:5173",
      },
    });

    expect(response.statusCode).toBe(403);
    expect(response.json()).toEqual({ error: { code: "CSRF_VALIDATION_FAILED" } });
    expect(sessions.revoke).not.toHaveBeenCalled();
    await app.close();
  });
});
