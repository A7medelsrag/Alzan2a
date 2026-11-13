import type { AdminRole, PrismaClient } from "@prisma/client";

export type AdminIdentity = {
  id: string;
  username: string;
  role: AdminRole;
};

export class AdminRepository {
  public constructor(private readonly db: PrismaClient) {}

  public findByUsername(username: string) {
    return this.db.adminAccount.findUnique({
      where: { username },
      select: {
        id: true,
        username: true,
        passwordHash: true,
        role: true,
        isActive: true,
        mfaSecretEncrypted: true,
        lastTotpCounter: true,
      },
    });
  }

  public findIdentityById(id: string) {
    return this.db.adminAccount.findUnique({
      where: { id },
      select: { id: true, username: true, role: true, isActive: true },
    });
  }

  public consumeTotpCounter(id: string, counter: bigint) {
    return this.db.adminAccount.updateMany({
      where: {
        id,
        OR: [
          { lastTotpCounter: null },
          { lastTotpCounter: { lt: counter } },
        ],
      },
      data: { lastTotpCounter: counter },
    });
  }

  public consumeRecoveryCode(adminId: string, codeHash: string) {
    return this.db.adminRecoveryCode.updateMany({
      where: { adminId, codeHash, usedAt: null },
      data: { usedAt: new Date() },
    });
  }

  public async recordLogin(id: string): Promise<void> {
    await this.db.$transaction(async (transaction) => {
      await transaction.adminAccount.update({
        where: { id },
        data: { lastLoginAt: new Date() },
      });
      await transaction.auditLog.create({
        data: {
          actorId: id,
          action: "ADMIN_LOGIN",
          entity: "AdminAccount",
          entityId: id,
        },
      });
    });
  }

  public recordLogout(id: string) {
    return this.db.auditLog.create({
      data: {
        actorId: id,
        action: "ADMIN_LOGOUT",
        entity: "AdminAccount",
        entityId: id,
      },
    });
  }
}
