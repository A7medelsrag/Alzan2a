import { createHash } from "node:crypto";

const idleTimeoutSeconds = 15 * 60;
const absoluteTimeoutSeconds = 8 * 60 * 60;
const loginWindowSeconds = 15 * 60;

export type AdminSession = {
  adminId: string;
  csrfToken: string;
  createdAt: number;
};

export type AdminSessionRedis = {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, options: { EX: number }): Promise<unknown>;
  expire(key: string, seconds: number): Promise<number>;
  del(key: string): Promise<number>;
  incr(key: string): Promise<number>;
  sAdd?(key: string, member: string): Promise<number>;
  sRem?(key: string, member: string): Promise<number>;
  sMembers?(key: string): Promise<string[]>;
};

export interface AdminSessionStore {
  create(sessionToken: string, session: AdminSession): Promise<void>;
  get(sessionToken: string): Promise<AdminSession | null>;
  revoke(sessionToken: string): Promise<void>;
  recordFailedLogin(accountKey: string): Promise<number>;
  clearFailedLogins(accountKey: string): Promise<void>;
  revokeAllForAdmin?(adminId: string): Promise<void>;
}

export class RedisAdminSessionStore implements AdminSessionStore {
  public constructor(private readonly redis: AdminSessionRedis) {}

  public async create(sessionToken: string, session: AdminSession): Promise<void> {
    await this.redis.set(this.sessionKey(sessionToken), JSON.stringify(session), {
      EX: idleTimeoutSeconds,
    });
    await this.redis.sAdd?.(this.adminSessionsKey(session.adminId), this.sessionKey(sessionToken));
    await this.redis.expire(this.adminSessionsKey(session.adminId), absoluteTimeoutSeconds);
  }

  public async get(sessionToken: string): Promise<AdminSession | null> {
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
    if (!isAdminSession(value)) {
      await this.redis.del(key);
      return null;
    }

    const absoluteRemaining = absoluteTimeoutSeconds - Math.floor((Date.now() - value.createdAt) / 1_000);
    if (absoluteRemaining <= 0) {
      await this.redis.del(key);
      return null;
    }
    const refreshed = await this.redis.expire(key, Math.min(idleTimeoutSeconds, absoluteRemaining));
    return refreshed ? value : null;
  }

  public async revoke(sessionToken: string): Promise<void> {
    const key = this.sessionKey(sessionToken);
    const serialized = await this.redis.get(key);
    await this.redis.del(key);
    if (serialized && this.redis.sRem) {
      try { const session = JSON.parse(serialized) as AdminSession; if (session.adminId) await this.redis.sRem(this.adminSessionsKey(session.adminId), key); } catch { /* invalid sessions are already revoked */ }
    }
  }

  public async revokeAllForAdmin(adminId: string): Promise<void> {
    if (!this.redis.sMembers) return;
    const index = this.adminSessionsKey(adminId);
    const keys = await this.redis.sMembers(index);
    await Promise.all(keys.map((key) => this.redis.del(key)));
    await this.redis.del(index);
  }

  public async recordFailedLogin(accountKey: string): Promise<number> {
    const key = `zan2a:admin-login-failures:${accountKey}`;
    const attempts = await this.redis.incr(key);
    if (attempts === 1) await this.redis.expire(key, loginWindowSeconds);
    return attempts;
  }

  public async clearFailedLogins(accountKey: string): Promise<void> {
    await this.redis.del(`zan2a:admin-login-failures:${accountKey}`);
  }

  private sessionKey(sessionToken: string): string {
    const digest = createHash("sha256").update(sessionToken).digest("hex");
    return `zan2a:admin-session:${digest}`;
  }
  private adminSessionsKey(adminId: string): string { return `zan2a:admin-sessions:${adminId}`; }
}

function isAdminSession(value: unknown): value is AdminSession {
  return value !== null &&
    typeof value === "object" &&
    "adminId" in value &&
    typeof value.adminId === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value.adminId) &&
    "csrfToken" in value &&
    typeof value.csrfToken === "string" &&
    value.csrfToken.length >= 32 &&
    "createdAt" in value &&
    typeof value.createdAt === "number" &&
    Number.isSafeInteger(value.createdAt) &&
    value.createdAt > 0;
}
