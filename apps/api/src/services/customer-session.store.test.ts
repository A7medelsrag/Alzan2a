import { describe, expect, it, vi } from "vitest";
import { RedisCustomerSessionStore, type CustomerSessionRedis } from "./customer-session.store.js";

function createRedis() {
  const entries = new Map<string, string>();
  const set = vi.fn(async (key: string, value: string) => {
    entries.set(key, value);
    return "OK";
  });
  const get = vi.fn(async (key: string) => entries.get(key) ?? null);
  const expire = vi.fn(async (key: string) => Number(entries.has(key)));
  const del = vi.fn(async (key: string) => Number(entries.delete(key)));
  const incr = vi.fn(async () => 1);
  const redis: CustomerSessionRedis = { set, get, expire, del, incr };
  return { redis, entries, set, get, expire, del };
}

describe("Redis customer sessions", () => {
  it("stores sessions under a digest and refreshes the idle expiry", async () => {
    const { redis, entries, set, expire } = createRedis();
    const sessions = new RedisCustomerSessionStore(redis);
    const token = "opaque-session-token";
    const session = {
      customerId: "11111111-1111-4111-8111-111111111111",
      csrfToken: "csrf-token-with-sufficient-length-123456",
      createdAt: Date.now(),
    };

    await sessions.create(token, session);
    await expect(sessions.get(token)).resolves.toEqual(session);

    const key = set.mock.calls[0]?.[0];
    expect(key).toBeTruthy();
    expect(key).not.toContain(token);
    expect(entries.has(key ?? "")).toBe(true);
    expect(expire).toHaveBeenCalledWith(key, 30 * 60);
  });

  it("revokes expired or malformed sessions instead of accepting them", async () => {
    const { redis, entries, del } = createRedis();
    const sessions = new RedisCustomerSessionStore(redis);
    const expiredToken = "expired-session-token";
    await sessions.create(expiredToken, {
      customerId: "11111111-1111-4111-8111-111111111111",
      csrfToken: "csrf-token-with-sufficient-length-123456",
      createdAt: Date.now() - 8 * 24 * 60 * 60 * 1_000,
    });
    await expect(sessions.get(expiredToken)).resolves.toBeNull();
    expect(del).toHaveBeenCalledTimes(1);

    const malformedToken = "malformed-session-token";
    const key = "zan2a:customer-session:malformed";
    entries.set(key, "{");
    const malformedStore = new RedisCustomerSessionStore({
      ...redis,
      get: vi.fn().mockResolvedValue("{"),
      del: vi.fn().mockResolvedValue(1),
    });
    await expect(malformedStore.get(malformedToken)).resolves.toBeNull();
  });
});
