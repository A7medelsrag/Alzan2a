import argon2, { type HashOptions } from "argon2";
import { createHash, randomBytes } from "node:crypto";
import type { AdminLoginInput } from "@store/shared";
import { AppError } from "../errors.js";
import { AdminRepository, type AdminIdentity } from "../repositories/admin.repository.js";
import type { AdminSessionStore } from "./admin-session.store.js";

const passwordHashOptions: HashOptions = {
  type: argon2.argon2id,
  memoryCost: 19_456,
  timeCost: 2,
  parallelism: 1,
};

export class AdminService {
  private dummyPasswordHash?: Promise<string>;

  public constructor(
    private readonly admins: AdminRepository,
    private readonly sessions?: AdminSessionStore,
  ) {}

  public async login(input: AdminLoginInput, previousToken?: string) {
    const sessions = this.requireSessionStore();
    const accountKey = createHash("sha256").update(input.username).digest("hex");
    const failures = await sessions.recordFailedLogin(accountKey);
    if (failures >= 5) await delay(Math.min(5_000, 250 * 2 ** Math.min(failures - 5, 5)));

    const admin = await this.admins.findByUsername(input.username);
    const passwordHash = admin?.passwordHash ?? await this.getDummyPasswordHash();
    const passwordMatches = await argon2.verify(passwordHash, input.password);
    if (!admin || !admin.isActive || !passwordMatches) {
      throw new AppError("ADMIN_CREDENTIALS_INVALID", 401);
    }

    await sessions.clearFailedLogins(accountKey);
    await this.admins.recordLogin(admin.id);
    const session = await this.createSession(admin.id);
    if (previousToken) await sessions.revoke(previousToken);
    return {
      data: this.toPublicAdmin(admin),
      csrfToken: session.csrfToken,
      sessionToken: session.token,
    };
  }

  public async getSession(sessionToken: string | undefined) {
    if (!sessionToken) throw new AppError("ADMIN_UNAUTHENTICATED", 401);
    const session = await this.requireSessionStore().get(sessionToken);
    if (!session) throw new AppError("ADMIN_UNAUTHENTICATED", 401);
    const admin = await this.admins.findIdentityById(session.adminId);
    if (!admin?.isActive) {
      await this.requireSessionStore().revoke(sessionToken);
      throw new AppError("ADMIN_UNAUTHENTICATED", 401);
    }
    return { data: this.toPublicAdmin(admin), csrfToken: session.csrfToken };
  }

  public async logout(sessionToken: string): Promise<void> {
    const session = await this.requireSessionStore().get(sessionToken);
    await this.requireSessionStore().revoke(sessionToken);
    if (session) await this.admins.recordLogout(session.adminId);
  }

  public async revokeAllSessions(adminId: string): Promise<void> {
    await this.requireSessionStore().revokeAllForAdmin?.(adminId);
  }

  private requireSessionStore(): AdminSessionStore {
    if (!this.sessions) throw new AppError("SERVICE_UNAVAILABLE", 503);
    return this.sessions;
  }

  private getDummyPasswordHash(): Promise<string> {
    this.dummyPasswordHash ??= argon2.hash("invalid-admin-account-password", passwordHashOptions);
    return this.dummyPasswordHash;
  }

  private async createSession(adminId: string) {
    const token = randomBytes(32).toString("base64url");
    const csrfToken = randomBytes(32).toString("base64url");
    await this.requireSessionStore().create(token, { adminId, csrfToken, createdAt: Date.now() });
    return { token, csrfToken };
  }

  private toPublicAdmin(admin: AdminIdentity) {
    return { id: admin.id, username: admin.username, role: admin.role };
  }
}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}
