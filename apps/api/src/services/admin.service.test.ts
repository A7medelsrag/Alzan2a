import argon2 from "argon2";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AppError } from "../errors.js";
import { AdminRepository } from "../repositories/admin.repository.js";
import { AdminService } from "./admin.service.js";
import { encryptTotpSecret, hashRecoveryCode } from "./admin-crypto.js";
import type { AdminSessionStore } from "./admin-session.store.js";

const adminId = "11111111-1111-4111-8111-111111111111";
const mfaKey = "a".repeat(64);
const username = "owner";

function createSessions(): AdminSessionStore {
  return {
    create: vi.fn(),
    get: vi.fn(),
    revoke: vi.fn(),
    recordFailedLogin: vi.fn().mockResolvedValue(1),
    clearFailedLogins: vi.fn(),
  };
}

describe("admin authentication service", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("requires MFA after validating the password", async () => {
    const passwordHash = await argon2.hash("a sufficiently long password");
    const admins = {
      findByUsername: vi.fn().mockResolvedValue({
        id: adminId,
        username,
        passwordHash,
        role: "OWNER",
        isActive: true,
        mfaSecretEncrypted: encryptTotpSecret("secret", mfaKey),
        lastTotpCounter: null,
      }),
    } as unknown as AdminRepository;
    const service = new AdminService(admins, createSessions(), mfaKey);

    await expect(service.login({ username, password: "a sufficiently long password" }))
      .rejects.toMatchObject({ code: "ADMIN_MFA_REQUIRED", statusCode: 401 });
  });

  it("creates a session only once for a TOTP counter", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(59_000));
    const passwordHash = await argon2.hash("a sufficiently long password");
    const admins = {
      findByUsername: vi.fn().mockResolvedValue({
        id: adminId,
        username,
        passwordHash,
        role: "OWNER",
        isActive: true,
        mfaSecretEncrypted: encryptTotpSecret("GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ", mfaKey),
        lastTotpCounter: null,
      }),
      consumeTotpCounter: vi.fn().mockResolvedValue({ count: 1 }),
      recordLogin: vi.fn(),
    } as unknown as AdminRepository;
    const sessions = createSessions();
    const service = new AdminService(admins, sessions, mfaKey);

    const result = await service.login({
      username,
      password: "a sufficiently long password",
      mfaCode: "287082",
    });

    expect(result.data).toEqual({ id: adminId, username, role: "OWNER" });
    expect(result.sessionToken).toHaveLength(43);
    expect(admins.consumeTotpCounter).toHaveBeenCalledWith(adminId, 1n);
    expect(sessions.create).toHaveBeenCalledOnce();
  });

  it("rejects a TOTP code that was already consumed", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(59_000));
    const passwordHash = await argon2.hash("a sufficiently long password");
    const admins = {
      findByUsername: vi.fn().mockResolvedValue({
        id: adminId,
        username,
        passwordHash,
        role: "OWNER",
        isActive: true,
        mfaSecretEncrypted: encryptTotpSecret("GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ", mfaKey),
        lastTotpCounter: 1n,
      }),
      consumeTotpCounter: vi.fn().mockResolvedValue({ count: 0 }),
      recordLogin: vi.fn(),
    } as unknown as AdminRepository;
    const sessions = createSessions();
    const service = new AdminService(admins, sessions, mfaKey);

    await expect(service.login({
      username,
      password: "a sufficiently long password",
      mfaCode: "287082",
    })).rejects.toMatchObject({ code: "ADMIN_CREDENTIALS_INVALID" } satisfies Partial<AppError>);
    expect(sessions.create).not.toHaveBeenCalled();
  });

  it("accepts a recovery code only through the one-use database operation", async () => {
    const passwordHash = await argon2.hash("a sufficiently long password");
    const recoveryCode = "abcde-f0123-45678-9abcd";
    const admins = {
      findByUsername: vi.fn().mockResolvedValue({
        id: adminId,
        username,
        passwordHash,
        role: "OWNER",
        isActive: true,
        mfaSecretEncrypted: encryptTotpSecret("GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ", mfaKey),
        lastTotpCounter: null,
      }),
      consumeRecoveryCode: vi.fn().mockResolvedValue({ count: 1 }),
      recordLogin: vi.fn(),
    } as unknown as AdminRepository;
    const sessions = createSessions();
    const service = new AdminService(admins, sessions, mfaKey);

    await expect(service.login({
      username,
      password: "a sufficiently long password",
      mfaCode: recoveryCode,
    })).resolves.toMatchObject({ data: { id: adminId } });

    expect(admins.consumeRecoveryCode).toHaveBeenCalledWith(adminId, hashRecoveryCode(recoveryCode));
  });
});
