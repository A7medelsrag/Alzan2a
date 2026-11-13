import { createHash } from "node:crypto";

const staffUploadRateLimitScript = `
local max = tonumber(ARGV[1])
local windowMs = tonumber(ARGV[2])
local count = tonumber(redis.call('GET', KEYS[1]) or '0')
if count >= max then
  return {count, redis.call('PTTL', KEYS[1]), 0}
end
count = redis.call('INCR', KEYS[1])
if count == 1 then
  redis.call('PEXPIRE', KEYS[1], windowMs)
end
return {count, redis.call('PTTL', KEYS[1]), 1}
`;

const adminIdPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type StaffUploadRateLimitResult = {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
};

export interface StaffUploadRateLimitStore {
  consume(staffId: string): Promise<StaffUploadRateLimitResult>;
}

export interface RedisEvalClient {
  eval(script: string, options: { keys: string[]; arguments: string[] }): Promise<unknown>;
}

export class StaffUploadRateLimitUnavailable extends Error {
  public constructor(public readonly causeName: string) {
    super("Staff upload rate limit store is unavailable");
  }
}

export class RedisStaffUploadRateLimitStore implements StaffUploadRateLimitStore {
  public constructor(
    private readonly redis: RedisEvalClient,
    private readonly maxRequests = 10,
    private readonly windowMs = 10 * 60 * 1_000,
  ) {
    if (!Number.isSafeInteger(maxRequests) || maxRequests < 1 ||
        !Number.isSafeInteger(windowMs) || windowMs < 1_000) {
      throw new Error("Invalid staff upload rate limit configuration");
    }
  }

  public async consume(staffId: string): Promise<StaffUploadRateLimitResult> {
    if (!adminIdPattern.test(staffId)) throw new Error("Invalid authenticated staff ID");
    const key = this.keyFor(staffId);
    let response: unknown;
    try {
      response = await this.redis.eval(staffUploadRateLimitScript, {
        keys: [key],
        arguments: [String(this.maxRequests), String(this.windowMs)],
      });
    } catch (error) {
      throw new StaffUploadRateLimitUnavailable(errorName(error));
    }

    if (!Array.isArray(response) || response.length !== 3) {
      throw new StaffUploadRateLimitUnavailable("InvalidRedisResponse");
    }
    const count = Number(response[0]);
    const ttlMs = Number(response[1]);
    const allowed = Number(response[2]);
    if (!Number.isSafeInteger(count) || count < 0 ||
        !Number.isSafeInteger(ttlMs) || ttlMs <= 0 ||
        (allowed !== 0 && allowed !== 1)) {
      throw new StaffUploadRateLimitUnavailable("InvalidRedisResponse");
    }

    return {
      allowed: allowed === 1,
      remaining: Math.max(0, this.maxRequests - count),
      retryAfterSeconds: Math.max(1, Math.ceil(ttlMs / 1_000)),
    };
  }

  private keyFor(staffId: string): string {
    const digest = createHash("sha256").update(staffId).digest("hex");
    return `zan2a:media-upload:staff:${digest}`;
  }
}

function errorName(error: unknown): string {
  return error instanceof Error ? error.name : "UnknownError";
}
