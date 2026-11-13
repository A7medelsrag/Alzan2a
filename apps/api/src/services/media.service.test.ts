import { describe, expect, it, vi } from "vitest";
import sharp from "sharp";
import { AppError } from "../errors.js";
import type { MediaStorage } from "./media-storage.js";
import { MediaStorageError } from "./media-storage.js";
import {
  maxImageDimension,
  maxImagePixels,
  maxUploadBytes,
  MediaAuditFailure,
  MediaService,
  validateImageDimensions,
} from "./media.service.js";

function createStorage() {
  const objects = new Map<string, Buffer>();
  const storage: MediaStorage = {
    putObject: vi.fn(async (key, body) => {
      objects.set(key, body);
    }),
    deleteObject: vi.fn(async (key) => {
      objects.delete(key);
    }),
    publicUrl: vi.fn((key) => `https://cdn.example.com/media/${key}`),
  };
  return { storage, objects };
}

async function createPng(width = 3, height = 2): Promise<Buffer> {
  return sharp({
    create: {
      width,
      height,
      channels: 3,
      background: "#7A1535",
    },
  }).png().toBuffer();
}

describe("MediaService", () => {
  it("re-encodes images to WebP, applies EXIF orientation, and removes metadata", async () => {
    const source = await sharp({
      create: {
        width: 3,
        height: 2,
        channels: 3,
        background: "#7A1535",
      },
    }).jpeg().withMetadata({ orientation: 6, density: 300 }).toBuffer();
    const sourceMetadata = await sharp(source).metadata();
    expect(sourceMetadata.orientation).toBe(6);

    const { storage, objects } = createStorage();
    const recordUpload = vi.fn().mockResolvedValue({});
    const service = new MediaService(storage, { recordUpload });
    const result = await service.upload({ data: source, contentType: "image/jpeg" }, "admin-id");
    const processed = objects.get(result.key);
    expect(processed).toBeDefined();
    const outputMetadata = await sharp(processed).metadata();

    expect(result).toMatchObject({
      url: expect.stringMatching(/^https:\/\/cdn\.example\.com\/media\//),
      width: 2,
      height: 3,
      format: "webp",
      size: processed?.length,
    });
    expect(outputMetadata.format).toBe("webp");
    expect(outputMetadata.orientation).toBeUndefined();
    expect(outputMetadata.exif).toBeUndefined();
    expect(storage.putObject).toHaveBeenCalledWith(
      expect.stringMatching(/^homepage-banners\/[0-9a-f-]+\.webp$/i),
      expect.any(Buffer),
      "image/webp",
      "public, max-age=31536000, immutable",
    );
    expect(recordUpload).toHaveBeenCalledWith("admin-id", result.key, {
      width: 2,
      height: 3,
      size: processed?.length,
      format: "webp",
    });
  });

  it("rejects MIME/signature mismatches and active-content formats", async () => {
    const { storage } = createStorage();
    const service = new MediaService(storage, { recordUpload: vi.fn() });
    const png = await createPng();

    await expect(service.upload({ data: png, contentType: "image/jpeg" }, "admin-id"))
      .rejects.toMatchObject({ code: "MEDIA_INVALID_FILE" });
    await expect(service.upload({
      data: Buffer.from("<svg xmlns='http://www.w3.org/2000/svg'></svg>"),
      contentType: "image/svg+xml",
    }, "admin-id")).rejects.toMatchObject({ code: "MEDIA_INVALID_FILE" });
    expect(storage.putObject).not.toHaveBeenCalled();
  });

  it("rejects corrupt images, oversized files, and invalid dimensions", async () => {
    const { storage } = createStorage();
    const service = new MediaService(storage, { recordUpload: vi.fn() });
    const corruptPng = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 0]);

    await expect(service.upload({ data: corruptPng, contentType: "image/png" }, "admin-id"))
      .rejects.toMatchObject({ code: "MEDIA_IMAGE_INVALID" });
    await expect(service.upload({
      data: Buffer.alloc(maxUploadBytes + 1),
      contentType: "image/png",
    }, "admin-id")).rejects.toMatchObject({ code: "MEDIA_FILE_TOO_LARGE" });

    expect(() => validateImageDimensions(maxImageDimension, 1)).not.toThrow();
    expect(() => validateImageDimensions(maxImageDimension + 1, 1)).toThrowError(
      expect.objectContaining({ code: "MEDIA_IMAGE_DIMENSIONS_INVALID" }),
    );
    expect(() => validateImageDimensions(maxImagePixels / 8_000, 8_000)).not.toThrow();
    expect(() => validateImageDimensions(8_001, 5_000)).toThrowError(
      expect.objectContaining({ code: "MEDIA_IMAGE_DIMENSIONS_INVALID" }),
    );
    expect(storage.putObject).not.toHaveBeenCalled();
  });

  it("maps storage errors without exposing provider details", async () => {
    const storage: MediaStorage = {
      putObject: vi.fn().mockRejectedValue(new MediaStorageError("write", new Error("secret access key"))),
      deleteObject: vi.fn(),
      publicUrl: vi.fn(),
    };
    const service = new MediaService(storage, { recordUpload: vi.fn() });

    await expect(service.upload({ data: await createPng(), contentType: "image/png" }, "admin-id"))
      .rejects.toEqual(new AppError("MEDIA_STORAGE_UNAVAILABLE", 503));
  });

  it("removes the stored object if audit persistence fails", async () => {
    const { storage, objects } = createStorage();
    const recordUpload = vi.fn().mockRejectedValue(new Error("database credentials"));
    const service = new MediaService(storage, { recordUpload });

    await expect(service.upload({ data: await createPng(), contentType: "image/png" }, "admin-id"))
      .rejects.toBeInstanceOf(MediaAuditFailure);
    expect(objects.size).toBe(0);
    expect(storage.deleteObject).toHaveBeenCalledOnce();
  });
});
