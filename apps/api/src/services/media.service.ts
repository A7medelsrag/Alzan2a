import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { AppError } from "../errors.js";
import { mediaObjectKeyPattern, MediaStorageError, type MediaStorage } from "./media-storage.js";

export const maxUploadBytes = 5 * 1024 * 1024;
export const maxImageDimension = 8_192;
export const maxImagePixels = 40_000_000;
export const maxProcessedImageBytes = 12 * 1024 * 1024;
export const publicImageCacheControl = "public, max-age=31536000, immutable";

type RasterFormat = "jpeg" | "png" | "webp";

type ProcessedImage = {
  data: Buffer;
  width: number;
  height: number;
  size: number;
};

export interface MediaAuditRepository {
  recordUpload(
    actorId: string,
    key: string,
    metadata: { width: number; height: number; size: number; format: string },
  ): Promise<unknown>;
}

export class MediaAuditFailure extends Error {
  public constructor(
    public readonly auditErrorName: string,
    public readonly cleanupErrorName?: string,
  ) {
    super("Media upload audit could not be completed");
  }
}

export class MediaService {
  public constructor(
    private readonly storage: MediaStorage,
    private readonly repository: MediaAuditRepository,
  ) {}

  public async upload(input: { data: Buffer; contentType: string }, actorId: string) {
    if (input.data.length > maxUploadBytes) throw new AppError("MEDIA_FILE_TOO_LARGE", 413);
    const processed = await processImage(input.data, input.contentType);
    const key = `homepage-banners/${randomUUID()}.webp`;
    if (!mediaObjectKeyPattern.test(key)) throw new Error("Generated media key did not match the storage policy");

    try {
      await this.storage.putObject(key, processed.data, "image/webp", publicImageCacheControl);
    } catch (error) {
      if (error instanceof MediaStorageError) {
        throw new AppError("MEDIA_STORAGE_UNAVAILABLE", 503);
      }
      throw error;
    }

    try {
      await this.repository.recordUpload(actorId, key, {
        width: processed.width,
        height: processed.height,
        size: processed.size,
        format: "webp",
      });
    } catch (auditError) {
      try {
        await this.storage.deleteObject(key);
      } catch (cleanupError) {
        throw new MediaAuditFailure(errorName(auditError), errorName(cleanupError));
      }
      throw new MediaAuditFailure(errorName(auditError));
    }

    return {
      url: this.storage.publicUrl(key),
      key,
      width: processed.width,
      height: processed.height,
      format: "webp",
      size: processed.size,
    };
  }
}

async function processImage(data: Buffer, contentType: string): Promise<ProcessedImage> {
  const detectedFormat = detectRasterFormat(data);
  if (!detectedFormat || normalizeContentType(contentType) !== contentTypeFor(detectedFormat)) {
    throw new AppError("MEDIA_INVALID_FILE", 400);
  }

  let image: ReturnType<typeof sharp>;
  let metadata: Awaited<ReturnType<ReturnType<typeof sharp>["metadata"]>>;
  try {
    image = sharp(data, {
      failOn: "warning",
      limitInputPixels: maxImagePixels,
      sequentialRead: true,
    });
    metadata = await image.metadata();
  } catch (error) {
    if (error instanceof Error) throw new AppError("MEDIA_IMAGE_INVALID", 400);
    throw error;
  }

  if (metadata.format !== detectedFormat || (metadata.pages ?? 1) !== 1) {
    throw new AppError("MEDIA_IMAGE_INVALID", 400);
  }
  const width = metadata.width;
  const height = metadata.height;
  validateImageDimensions(width, height);

  try {
    const result = await image
      .rotate()
      .resize({
        width: maxImageDimension,
        height: maxImageDimension,
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: 82, effort: 4 })
      .toBuffer({ resolveWithObject: true });
    if (result.data.length > maxProcessedImageBytes) {
      throw new AppError("MEDIA_PROCESSED_IMAGE_TOO_LARGE", 413);
    }
    return {
      data: result.data,
      width: result.info.width,
      height: result.info.height,
      size: result.data.length,
    };
  } catch (error) {
    if (error instanceof AppError) throw error;
    if (error instanceof Error) throw new AppError("MEDIA_IMAGE_INVALID", 400);
    throw error;
  }
}

export function validateImageDimensions(width: number | undefined, height: number | undefined): void {
  if (!width || !height || width > maxImageDimension || height > maxImageDimension ||
      width * height > maxImagePixels) {
    throw new AppError("MEDIA_IMAGE_DIMENSIONS_INVALID", 413);
  }
}

function detectRasterFormat(data: Buffer): RasterFormat | null {
  if (data.length >= 3 && data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff) return "jpeg";
  if (data.length >= 8 && data.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) return "png";
  if (data.length >= 12 &&
      data.toString("ascii", 0, 4) === "RIFF" &&
      data.toString("ascii", 8, 12) === "WEBP") return "webp";
  return null;
}

function normalizeContentType(value: string): string {
  return value.split(";", 1)[0]?.trim().toLowerCase() ?? "";
}

function contentTypeFor(format: RasterFormat): string {
  return format === "jpeg" ? "image/jpeg" : `image/${format}`;
}

function errorName(error: unknown): string {
  return error instanceof Error ? error.name : "UnknownError";
}
