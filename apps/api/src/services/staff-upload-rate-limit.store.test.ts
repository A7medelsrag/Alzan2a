import { describe, expect, it } from "vitest";
import {
  RedisStaffUploadRateLimitStore,
  StaffUploadRateLimitUnavailable,
  type RedisEvalClient,
} from "./staff-upload-rate-limit.store.js";

const staffId = "11111111-1111-4111-8111-111111111111";

class AtomicRedisFake implements RedisEvalClient {
  public readonly entries = new Map<string, { count: number; expiresAt: number }>();
  public readonly keys: string[] = [];
  public now = 1_000_000;
  public failWith?: Error;
  private queue = Promise.resolve();

  public async eval(
    script: string,
    options: { keys: string[]; arguments: string[] },
  ): Promise<unknown> {
    const previous = this.queue;
    let release: () => void = () => {};
    this.queue = new Promise<void>((resolve) => {
      release = resolve;
    });
    await previous;

    try {
      if (this.failWith) throw this.failWith;
      if (!script.includes("redis.call('INCR'") || !script.includes("redis.call('PEXPIRE'")) {
        throw new Error("Unexpected rate limit script");
      }

      const key = options.keys[0];
      if (key) this.keys.push(key);
      const max = Number(options.arguments[0]);
      const windowMs = Number(options.arguments[1]);
      if (!key || !Number.isSafeInteger(max) || !Number.isSafeInteger(windowMs)) {
        throw new Error("Invalid rate limit arguments");
      }

      let entry = this.entries.get(key);
      if (entry && entry.expiresAt <= this.now) {
        this.entries.delete(key);
        entry = undefined;
      }
      if (entry && entry.count >= max) {
        return [entry.count, entry.expiresAt - this.now, 0];
      }

      entry = entry
        ? { ...entry, count: entry.count + 1 }
        : { count: 1, expiresAt: this.now + windowMs };
      this.entries.set(key, entry);
      return [entry.count, entry.expiresAt - this.now, 1];
    } finally {
      release();
    }
  }
}

describe("Redis staff upload rate limits", () => {
  it("enforces the limit boundary and expires from the first accepted request", async () => {
    const redis = new AtomicRedisFake();
    const store = new RedisStaffUploadRateLimitStore(redis, 2, 2_000);

    await expect(store.consume(staffId)).resolves.toMatchObject({ allowed: true, remaining: 1 });
    await expect(store.consume(staffId)).resolves.toMatchObject({ allowed: true, remaining: 0 });
    await expect(store.consume(staffId)).resolves.toMatchObject({
      allowed: false,
      remaining: 0,
      retryAfterSeconds: 2,
    });

    redis.now += 1_999;
    await expect(store.consume(staffId)).resolves.toMatchObject({ allowed: false, retryAfterSeconds: 1 });
    redis.now += 1;
    await expect(store.consume(staffId)).resolves.toMatchObject({ allowed: true, remaining: 1 });
    await expect(store.consume("22222222-2222-4222-8222-222222222222"))
      .resolves.toMatchObject({ allowed: true, remaining: 1 });
  });

  it("shares an atomic limit across concurrent store instances", async () => {
    const redis = new AtomicRedisFake();
    const firstInstance = new RedisStaffUploadRateLimitStore(redis, 7, 60_000);
    const secondInstance = new RedisStaffUploadRateLimitStore(redis, 7, 60_000);

    const results = await Promise.all(Array.from({ length: 50 }, (_, index) =>
      (index % 2 === 0 ? firstInstance : secondInstance).consume(staffId),
    ));

    expect(results.filter((result) => result.allowed)).toHaveLength(7);
    expect(results.filter((result) => !result.allowed)).toHaveLength(43);
    expect(redis.entries.size).toBe(1);
    expect([...redis.entries.values()][0]?.count).toBe(7);
    expect(redis.keys).toHaveLength(50);
    expect(new Set(redis.keys).size).toBe(1);
  });

  it("hashes the authenticated staff ID in Redis keys and rejects invalid identities", async () => {
    const redis = new AtomicRedisFake();
    const store = new RedisStaffUploadRateLimitStore(redis);

    await store.consume(staffId);
    const key = [...redis.entries.keys()][0];
    expect(key).toMatch(/^zan2a:media-upload:staff:[0-9a-f]{64}$/);
    expect(key).not.toContain(staffId);
    await expect(store.consume("client-supplied-id")).rejects.toThrow("Invalid authenticated staff ID");
  });

  it("fails closed and returns no Redis details during outages", async () => {
    const redis = new AtomicRedisFake();
    redis.failWith = new Error("redis password should not escape");
    const store = new RedisStaffUploadRateLimitStore(redis);

    await expect(store.consume(staffId)).rejects.toBeInstanceOf(StaffUploadRateLimitUnavailable);
    await expect(store.consume(staffId)).rejects.toMatchObject({ causeName: "Error" });
  });
});
