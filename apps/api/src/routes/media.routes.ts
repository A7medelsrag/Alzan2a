import type { FastifyInstance, FastifyRequest } from "fastify";
import { hasAdminPermission } from "@store/shared";
import { AppError } from "../errors.js";
import { adminSessionCookieName, requireAdminOrigin, requireCsrf } from "./admin-auth.routes.js";
import { maxUploadBytes, MediaAuditFailure, MediaService, publicImageCacheControl } from "../services/media.service.js";
import {
  mediaObjectKeyPattern,
  MediaStorageError,
  type LocalMediaStorage,
} from "../services/media-storage.js";
import { AdminService } from "../services/admin.service.js";
import {
  StaffUploadRateLimitUnavailable,
  type StaffUploadRateLimitStore,
} from "../services/staff-upload-rate-limit.store.js";

type MediaParams = { prefix?: unknown; filename?: unknown };

function readMediaKey(request: FastifyRequest): string {
  const params = request.params as MediaParams;
  if (typeof params.prefix !== "string" || typeof params.filename !== "string") {
    throw new AppError("MEDIA_NOT_FOUND", 404);
  }
  const key = `${params.prefix}/${params.filename}`;
  if (!mediaObjectKeyPattern.test(key)) throw new AppError("MEDIA_NOT_FOUND", 404);
  return key;
}

function isMultipartParserLimitError(request: FastifyRequest, error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const errors = request.server.multipartErrors;
  return error instanceof errors.PartsLimitError ||
    error instanceof errors.FilesLimitError ||
    error instanceof errors.FieldsLimitError ||
    error instanceof errors.InvalidMultipartContentTypeError ||
    error instanceof errors.PrematureCloseError ||
    error instanceof errors.RequestFileTooLargeError;
}

async function readSingleImage(request: FastifyRequest): Promise<{ data: Buffer; contentType: string }> {
  if (!request.isMultipart()) throw new AppError("MEDIA_MULTIPART_REQUIRED", 400);

  let fileCount = 0;
  let invalidPart = false;
  let upload: { data: Buffer; contentType: string } | undefined;

  try {
    for await (const part of request.parts({
      limits: {
        fileSize: maxUploadBytes,
        files: 2,
        fields: 0,
        parts: 2,
        fieldNameSize: 64,
        headerPairs: 32,
      },
    })) {
      if (part.type !== "file") {
        invalidPart = true;
        continue;
      }

      fileCount += 1;
      if (fileCount > 1) {
        for await (const chunk of part.file) {
          void chunk;
          // Drain the extra part without buffering it.
        }
        continue;
      }

      const data = await part.toBuffer();
      if (part.file.truncated) throw new AppError("MEDIA_FILE_TOO_LARGE", 413);
      if (part.fieldname !== "file") {
        invalidPart = true;
        continue;
      }
      upload = { data, contentType: part.mimetype };
    }
  } catch (error) {
    if (isMultipartParserLimitError(request, error)) {
      throw new AppError("MEDIA_MULTIPART_INVALID", 400);
    }
    throw error;
  }

  if (invalidPart) throw new AppError("MEDIA_MULTIPART_INVALID", 400);
  if (fileCount > 1) throw new AppError("MEDIA_MULTIPLE_FILES", 400);
  if (!upload) throw new AppError("MEDIA_FILE_MISSING", 400);
  return upload;
}

export function registerAdminMediaRoutes(
  app: FastifyInstance,
  media: MediaService,
  admins: AdminService,
  allowedOrigins: string[],
  uploadRateLimitStore?: StaffUploadRateLimitStore,
): void {
  app.post("/upload", async (request, reply) => {
    requireAdminOrigin(request, allowedOrigins);
    const session = await admins.getSession(request.cookies[adminSessionCookieName]);
    if (!hasAdminPermission(session.data.role, "manageHomepage")) {
      throw new AppError("ADMIN_FORBIDDEN", 403);
    }
    requireCsrf(request, session.csrfToken);
    if (!uploadRateLimitStore) throw new AppError("UPLOAD_RATE_LIMIT_UNAVAILABLE", 503);

    let rateLimit: Awaited<ReturnType<StaffUploadRateLimitStore["consume"]>>;
    try {
      rateLimit = await uploadRateLimitStore.consume(session.data.id);
    } catch (error) {
      if (error instanceof StaffUploadRateLimitUnavailable) {
        request.log.error({ requestId: request.id, errorName: error.causeName }, "Upload rate limit unavailable");
        throw new AppError("UPLOAD_RATE_LIMIT_UNAVAILABLE", 503);
      }
      throw error;
    }
    if (!rateLimit.allowed) {
      reply.header("Retry-After", String(rateLimit.retryAfterSeconds));
      throw new AppError("RATE_LIMITED", 429);
    }

    const file = await readSingleImage(request);
    try {
      const result = await media.upload(file, session.data.id);
      request.log.info({ actorId: session.data.id, mediaKey: result.key }, "Admin media uploaded");
      return reply.status(201).send({ data: result });
    } catch (error) {
      if (error instanceof MediaAuditFailure) {
        request.log.error({
          requestId: request.id,
          auditErrorName: error.auditErrorName,
          cleanupErrorName: error.cleanupErrorName,
        }, "Admin media upload audit failed");
        throw new AppError("MEDIA_AUDIT_FAILED", 503);
      }
      if (error instanceof AppError &&
          (error.code === "MEDIA_STORAGE_UNAVAILABLE" || error.code === "MEDIA_AUDIT_FAILED")) {
        request.log.error({ requestId: request.id, errorCode: error.code }, "Admin media upload failed");
      }
      throw error;
    }
  });
}

export function registerLocalMediaReadRoute(app: FastifyInstance, storage: LocalMediaStorage): void {
  app.get("/:prefix/:filename", async (request, reply) => {
    const key = readMediaKey(request);
    let data: Buffer | null;
    try {
      data = await storage.getPublicObject(key);
    } catch (error) {
      if (error instanceof MediaStorageError) {
        request.log.error({ requestId: request.id, errorName: error.causeName }, "Local media read failed");
        throw new AppError("MEDIA_STORAGE_UNAVAILABLE", 503);
      }
      throw error;
    }
    if (!data) throw new AppError("MEDIA_NOT_FOUND", 404);
    return reply.type("image/webp").header("Cache-Control", publicImageCacheControl).send(data);
  });
}
