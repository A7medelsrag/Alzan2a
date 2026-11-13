import type { PrismaClient } from "@prisma/client";

export class MediaRepository {
  public constructor(private readonly db: PrismaClient) {}

  public recordUpload(
    actorId: string,
    key: string,
    metadata: { width: number; height: number; size: number; format: string },
  ): Promise<unknown> {
    return this.db.auditLog.create({
      data: {
        actorId,
        action: "MEDIA_UPLOAD",
        entity: "MediaObject",
        entityId: key,
        metadata,
      },
    });
  }
}
