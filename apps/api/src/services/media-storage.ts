import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { DeleteObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import type { ApiConfig } from "@store/shared";

export const mediaObjectKeyPattern =
  /^homepage-banners\/[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.webp$/i;

export class MediaStorageError extends Error {
  public readonly causeName: string;

  public constructor(operation: string, cause: unknown) {
    super(`Media storage ${operation} failed`);
    this.name = "MediaStorageError";
    this.causeName = cause instanceof Error ? cause.name : "UnknownError";
  }
}

export interface MediaStorage {
  putObject(key: string, body: Buffer, contentType: string, cacheControl: string): Promise<void>;
  deleteObject(key: string): Promise<void>;
  publicUrl(key: string): string;
  close?(): void;
}

export interface LocalMediaStorage extends MediaStorage {
  getPublicObject(key: string): Promise<Buffer | null>;
}

export class LocalFileMediaStorage implements LocalMediaStorage {
  private readonly directory: string;

  public constructor(directory: string, private readonly assetBaseUrl: string) {
    this.directory = path.resolve(directory);
  }

  public async putObject(key: string, body: Buffer): Promise<void> {
    const target = this.resolveObjectPath(key);
    try {
      await mkdir(path.dirname(target), { recursive: true, mode: 0o700 });
      await writeFile(target, body, { flag: "wx", mode: 0o600 });
    } catch (error) {
      throw new MediaStorageError("write", error);
    }
  }

  public async deleteObject(key: string): Promise<void> {
    const target = this.resolveObjectPath(key);
    try {
      await unlink(target);
    } catch (error) {
      if (isNodeError(error) && error.code === "ENOENT") return;
      throw new MediaStorageError("delete", error);
    }
  }

  public async getPublicObject(key: string): Promise<Buffer | null> {
    const target = this.resolveObjectPath(key);
    try {
      return await readFile(target);
    } catch (error) {
      if (isNodeError(error) && error.code === "ENOENT") return null;
      throw new MediaStorageError("read", error);
    }
  }

  public publicUrl(key: string): string {
    return `${trimTrailingSlashes(this.assetBaseUrl)}/${encodeObjectKey(key)}`;
  }

  public close(): void {}

  private resolveObjectPath(key: string): string {
    if (!mediaObjectKeyPattern.test(key)) throw new Error("Invalid generated media key");
    const target = path.resolve(this.directory, ...key.split("/"));
    if (!target.startsWith(`${this.directory}${path.sep}`)) throw new Error("Invalid generated media key");
    return target;
  }
}

export class S3CompatibleMediaStorage implements MediaStorage {
  private readonly client: S3Client;

  public constructor(
    private readonly bucket: string,
    private readonly assetBaseUrl: string,
    options: NonNullable<ApiConfig["media"]["s3"]>,
  ) {
    this.client = new S3Client({
      ...(options.endpoint ? { endpoint: options.endpoint } : {}),
      region: options.region,
      forcePathStyle: options.forcePathStyle,
      credentials: {
        accessKeyId: options.accessKeyId,
        secretAccessKey: options.secretAccessKey,
      },
      maxAttempts: 2,
    });
  }

  public async putObject(key: string, body: Buffer, contentType: string, cacheControl: string): Promise<void> {
    if (!mediaObjectKeyPattern.test(key)) throw new Error("Invalid generated media key");
    try {
      await this.client.send(new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
        CacheControl: cacheControl,
      }), { abortSignal: AbortSignal.timeout(15_000) });
    } catch (error) {
      throw new MediaStorageError("write", error);
    }
  }

  public async deleteObject(key: string): Promise<void> {
    if (!mediaObjectKeyPattern.test(key)) throw new Error("Invalid generated media key");
    try {
      await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }), {
        abortSignal: AbortSignal.timeout(10_000),
      });
    } catch (error) {
      throw new MediaStorageError("delete", error);
    }
  }

  public publicUrl(key: string): string {
    return `${trimTrailingSlashes(this.assetBaseUrl)}/${encodeObjectKey(key)}`;
  }

  public close(): void {
    this.client.destroy();
  }
}

export function createMediaStorage(config: ApiConfig["media"]): MediaStorage {
  if (config.driver === "local") {
    return new LocalFileMediaStorage(config.localDirectory, config.publicAssetBaseUrl);
  }
  if (!config.s3) throw new Error("S3 media storage configuration is missing");
  return new S3CompatibleMediaStorage(config.s3.bucket, config.publicAssetBaseUrl, config.s3);
}

function encodeObjectKey(key: string): string {
  return key.split("/").map(encodeURIComponent).join("/");
}

function trimTrailingSlashes(value: string): string {
  return value.replace(/\/+$/, "");
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error;
}
