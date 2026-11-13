import { describe, expect, it, vi } from "vitest";
import { RedisAdminSessionStore, type AdminSessionRedis } from "./admin-session.store.js";

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
  const redis: AdminSessionRedis = { set, get, expire, del, incr };
  return { redis, entries, set, expire, del };
}

describe("Redis admin sessions", () => {
  it("stores an opaque digest and refreshes the shorter admin idle timeout", async () => {
    const { redis, entries, set, expire } = createRedis();
    const sessions = new RedisAdminSessionStore(redis);
    const token = "opaque-admin-session";
    const session = {
      adminId: "11111111-1111-4111-8111-111111111111",
      csrfToken: "csrf-token-with-sufficient-length-123456",
      createdAt: Date.now(),
    };

    await sessions.create(token, session);
    await expect(sessions.get(token)).resolves.toEqual(session);

    const key = set.mock.calls[0]?.[0];
    expect(key).toBeTruthy();
    expect(key).not.toContain(token);
    expect(entries.has(key ?? "")).toBe(true);
    expect(expire).toHaveBeenCalledWith(key, 15 * 60);
  });

  it("deletes an expired absolute session rather than refreshing it", async () => {
    const { redis, del } = createRedis();
    const sessions = new RedisAdminSessionStore(redis);
    const token = "expired-admin-session";

    await sessions.create(token, {
      adminId: "11111111-1111-4111-8111-111111111111",
      csrfToken: "csrf-token-with-sufficient-length-123456",
      createdAt: Date.now() - 9 * 60 * 60 * 1_000,
    });

    await expect(sessions.get(token)).resolves.toBeNull();
    expect(del).toHaveBeenCalledOnce();
  });
});
