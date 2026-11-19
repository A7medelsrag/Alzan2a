import argon2 from "argon2";
import { describe, expect, it, vi } from "vitest";
import { AppError } from "../errors.js";
import { AdminRepository } from "../repositories/admin.repository.js";
import { AdminService } from "./admin.service.js";
import type { AdminSessionStore } from "./admin-session.store.js";

const adminId = "11111111-1111-4111-8111-111111111111";
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
  it("logs in with username and password without requiring MFA even for accounts with an existing secret", async () => {
    const passwordHash = await argon2.hash("a sufficiently long password");
    const admins = {
      findByUsername: vi.fn().mockResolvedValue({
        id: adminId,
        username,
        passwordHash,
        role: "OWNER",
        isActive: true,
        mfaSecretEncrypted: "legacy-encrypted-secret",
        lastTotpCounter: null,
      }),
      recordLogin: vi.fn(),
    } as unknown as AdminRepository;
    const sessions = createSessions();
    const service = new AdminService(admins, sessions);

    const result = await service.login({ username, password: "a sufficiently long password" });

    expect(result.data).toEqual({ id: adminId, username, role: "OWNER" });
    expect(result.sessionToken).toHaveLength(43);
    expect(sessions.clearFailedLogins).toHaveBeenCalledOnce();
    expect(admins.recordLogin).toHaveBeenCalledWith(adminId);
    expect(sessions.create).toHaveBeenCalledOnce();
  });

  it("rejects invalid passwords without creating a session", async () => {
    const passwordHash = await argon2.hash("a sufficiently long password");
    const admins = {
      findByUsername: vi.fn().mockResolvedValue({
        id: adminId,
        username,
        passwordHash,
        role: "OWNER",
        isActive: true,
        mfaSecretEncrypted: "DISABLED",
        lastTotpCounter: null,
      }),
      recordLogin: vi.fn(),
    } as unknown as AdminRepository;
    const sessions = createSessions();
    const service = new AdminService(admins, sessions);

    await expect(service.login({ username, password: "wrong password" })).rejects.toMatchObject({
      code: "ADMIN_CREDENTIALS_INVALID",
      statusCode: 401,
    } satisfies Partial<AppError>);
    expect(sessions.create).not.toHaveBeenCalled();
  });

  it("rejects inactive admin accounts", async () => {
    const passwordHash = await argon2.hash("a sufficiently long password");
    const admins = {
      findByUsername: vi.fn().mockResolvedValue({
        id: adminId,
        username,
        passwordHash,
        role: "MANAGER",
        isActive: false,
        mfaSecretEncrypted: "DISABLED",
        lastTotpCounter: null,
      }),
      recordLogin: vi.fn(),
    } as unknown as AdminRepository;
    const sessions = createSessions();
    const service = new AdminService(admins, sessions);

    await expect(
      service.login({ username, password: "a sufficiently long password" }),
    ).rejects.toMatchObject({ code: "ADMIN_CREDENTIALS_INVALID", statusCode: 401 });
    expect(sessions.create).not.toHaveBeenCalled();
  });
});
