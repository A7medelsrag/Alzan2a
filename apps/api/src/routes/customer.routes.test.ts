import type { PrismaClient } from "@prisma/client";
import { OAuth2Client } from "google-auth-library";
import { describe, expect, it, vi } from "vitest";
import { buildServer } from "../server.js";
import type { CustomerSessionStore } from "../services/customer-session.store.js";

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
  googleClientId: "test-google-client-id",
  media: {
    driver: "local" as const,
    localDirectory: ".media-test",
    publicAssetBaseUrl: "https://localhost:3000/api/v1/media",
  },
};

const customerId = "11111111-1111-4111-8111-111111111111";
const addressId = "22222222-2222-4222-8222-222222222222";
const csrfToken = "csrf-token-with-sufficient-length-123456";

function createSessionStore(): CustomerSessionStore {
  return {
    create: vi.fn(),
    get: vi.fn().mockResolvedValue({ customerId, csrfToken, createdAt: Date.now() }),
    revoke: vi.fn(),
    recordFailedLogin: vi.fn().mockResolvedValue(1),
    clearFailedLogins: vi.fn(),
  };
}

function createServer(updateMany = vi.fn().mockResolvedValue({ count: 0 })) {
  const sessions = createSessionStore();
  const findMany = vi.fn().mockResolvedValue([]);
  const findUnique = vi.fn().mockImplementation(({ where }: { where: { id?: string; googleId?: string; email?: string } }) => {
    if (where.id) {
      return Promise.resolve({
        id: customerId,
        fullName: "منى أحمد",
        phoneE164: "+201012345678",
        email: "mona@example.com",
      });
    }
    return Promise.resolve(null);
  });
  const create = vi.fn().mockImplementation(({ data }: { data: { fullName: string; email: string; googleId: string } }) => {
    return Promise.resolve({
      id: customerId,
      fullName: data.fullName,
      phoneE164: null,
      email: data.email,
      googleId: data.googleId,
    });
  });

  const database = {
    customer: { findUnique, create },
    customerAddress: { updateMany, findMany },
  } as unknown as PrismaClient;

  return {
    app: buildServer(database, config, sessions),
    updateMany,
    findMany,
    sessions,
  };
}

describe("customer address authorization", () => {
  it("requires a customer session and CSRF token before changing an address", async () => {
    const { app, updateMany } = createServer();
    const anonymous = await app.inject({
      method: "PATCH",
      url: `/api/v1/store/customer/addresses/${addressId}`,
      payload: {},
    });
    const missingCsrf = await app.inject({
      method: "PATCH",
      url: `/api/v1/store/customer/addresses/${addressId}`,
      headers: { cookie: "__Host-customer_session=opaque-session" },
      payload: {},
    });

    expect(anonymous.statusCode).toBe(401);
    expect(missingCsrf.statusCode).toBe(403);
    expect(updateMany).not.toHaveBeenCalled();
    await app.close();
  });

  it("cannot update another customer's address by changing its ID", async () => {
    const { app, updateMany } = createServer();
    const response = await app.inject({
      method: "PATCH",
      url: `/api/v1/store/customer/addresses/${addressId}`,
      headers: {
        cookie: "__Host-customer_session=opaque-session",
        "x-csrf-token": csrfToken,
      },
      payload: {
        label: "المنزل",
        governorate: "القاهرة",
        cityArea: "مدينة نصر",
        detailedAddress: "شارع مثال، مبنى ١",
      },
    });

    expect(response.statusCode).toBe(404);
    expect(updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: addressId, customerId },
    }));
    await app.close();
  });

  it("returns only addresses for the authenticated customer session", async () => {
    const { app, findMany } = createServer();
    const response = await app.inject({
      method: "GET",
      url: "/api/v1/store/customer/addresses",
      headers: { cookie: "__Host-customer_session=opaque-session" },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ data: [] });
    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { customerId } }));
    await app.close();
  });

  it("authenticates via Google OAuth endpoint and sets session cookie", async () => {
    vi.spyOn(OAuth2Client.prototype, "verifyIdToken").mockResolvedValue({
      getPayload: () => ({
        sub: "google-user-123",
        email: "google@example.com",
        name: "Google Customer",
        email_verified: true,
      }),
    } as never);

    const { app } = createServer();
    const response = await app.inject({
      method: "POST",
      url: "/api/v1/store/customer/auth/google",
      payload: { credential: "mock-google-credential-token" },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.data.email).toBe("google@example.com");
    expect(body.data.fullName).toBe("Google Customer");
    expect(response.headers["set-cookie"]).toBeDefined();
    expect(response.headers["set-cookie"]).toContain("__Host-customer_session");
    await app.close();
  });

  it("supports /api/v1/store/auth/google endpoint alias", async () => {
    vi.spyOn(OAuth2Client.prototype, "verifyIdToken").mockResolvedValue({
      getPayload: () => ({
        sub: "google-user-456",
        email: "google-alias@example.com",
        name: "Google Alias",
        email_verified: true,
      }),
    } as never);

    const { app } = createServer();
    const response = await app.inject({
      method: "POST",
      url: "/api/v1/store/auth/google",
      payload: { credential: "mock-google-credential-token" },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.data.email).toBe("google-alias@example.com");
    expect(body.data.fullName).toBe("Google Alias");
    await app.close();
  });
});
