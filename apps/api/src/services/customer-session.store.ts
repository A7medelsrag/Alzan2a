import { createHash, timingSafeEqual } from "node:crypto";

const idleTimeoutSeconds = 30 * 60;
const absoluteTimeoutSeconds = 7 * 24 * 60 * 60;
const loginWindowSeconds = 15 * 60;
export type CustomerSession = {
  customerId: string;
  csrfToken: string;
  createdAt: number;
};

export type CustomerSessionRedis = {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, options: { EX: number }): Promise<unknown>;
  expire(key: string, seconds: number): Promise<number>;
  del(key: string): Promise<number>;
  incr(key: string): Promise<number>;
};

export interface CustomerSessionStore {
  create(sessionToken: string, session: CustomerSession): Promise<void>;
  get(sessionToken: string): Promise<CustomerSession | null>;
  revoke(sessionToken: string): Promise<void>;
  recordFailedLogin(accountKey: string): Promise<number>;
  clearFailedLogins(accountKey: string): Promise<void>;
}

export class RedisCustomerSessionStore implements CustomerSessionStore {
  public constructor(private readonly redis: CustomerSessionRedis) {}

  public async create(sessionToken: string, session: CustomerSession): Promise<void> {
    await this.redis.set(this.sessionKey(sessionToken), JSON.stringify(session), {
      EX: idleTimeoutSeconds,
    });
  }

  public async get(sessionToken: string): Promise<CustomerSession | null> {
    const key = this.sessionKey(sessionToken);
    const serialized = await this.redis.get(key);
    if (!serialized) return null;

    let value: unknown;
    try {
      value = JSON.parse(serialized);
    } catch (error) {
      if (!(error instanceof SyntaxError)) throw error;
      await this.redis.del(key);
      return null;
    }

    if (!isCustomerSession(value)) {
      await this.redis.del(key);
      return null;
    }

    const absoluteRemaining = absoluteTimeoutSeconds -
      Math.floor((Date.now() - value.createdAt) / 1_000);
    if (absoluteRemaining <= 0) {
      await this.redis.del(key);
      return null;
    }

    const refreshed = await this.redis.expire(key, Math.min(idleTimeoutSeconds, absoluteRemaining));
    return refreshed ? value : null;
  }

  public async revoke(sessionToken: string): Promise<void> {
    await this.redis.del(this.sessionKey(sessionToken));
  }

  public async recordFailedLogin(accountKey: string): Promise<number> {
    const key = `zan2a:customer-login-failures:${accountKey}`;
    const attempts = await this.redis.incr(key);
    if (attempts === 1) await this.redis.expire(key, loginWindowSeconds);
    return attempts;
  }

  public async clearFailedLogins(accountKey: string): Promise<void> {
    await this.redis.del(`zan2a:customer-login-failures:${accountKey}`);
  }

  private sessionKey(sessionToken: string): string {
    const digest = createHash("sha256").update(sessionToken).digest("hex");
    return `zan2a:customer-session:${digest}`;
  }
}

function isCustomerSession(value: unknown): value is CustomerSession {
  return value !== null &&
    typeof value === "object" &&
    "customerId" in value &&
    typeof value.customerId === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value.customerId) &&
    "csrfToken" in value &&
    typeof value.csrfToken === "string" &&
    value.csrfToken.length >= 32 &&
    "createdAt" in value &&
    typeof value.createdAt === "number" &&
    Number.isSafeInteger(value.createdAt) &&
    value.createdAt > 0;
}

export function tokensMatch(actual: string, expected: string): boolean {
  const actualBytes = Buffer.from(actual);
  const expectedBytes = Buffer.from(expected);
  return actualBytes.length === expectedBytes.length && timingSafeEqual(actualBytes, expectedBytes);
}
